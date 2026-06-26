import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ---------------------------------------------------------------
// GET /api/persons?q=&status=&limit=&offset=
// ---------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status");
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const values: unknown[]    = [];
    let i = 1;

    if (q) {
      conditions.push(`(cedula ILIKE $${i} OR full_name ILIKE $${i} OR full_name % $${i + 1})`);
      values.push(`%${q}%`, q);
      i += 2;
    }
    if (status === "missing" || status === "found") {
      conditions.push(`status = $${i}`);
      values.push(status);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows, count] = await Promise.all([
      client.query(
        `SELECT id, full_name, cedula, age, gender, last_seen_location,
                last_seen_date, description, photo_url, status, status_notes,
                reported_by_source, source_urls, first_seen_at, updated_at
         FROM missing_persons
         ${where}
         ORDER BY first_seen_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...values, limit, offset]
      ),
      client.query(`SELECT COUNT(*) FROM missing_persons ${where}`, values),
    ]);

    return NextResponse.json(
      { total: parseInt(count.rows[0].count), limit, offset, data: rows.rows },
      { headers: CORS }
    );
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------
// POST /api/persons
//
// Campos requeridos: full_name
// Deduplicación: cedula > (full_name + date_of_birth)
//
// Campos de trazabilidad de fuente (opcionales):
//   source_name       — nombre de la fuente (se crea si no existe)
//   source_url        — URL base de la fuente
//   source_type       — html | api | form | social | manual
//   source_record_id  — ID del registro en la fuente original
//   source_record_url — URL exacta del registro en la fuente
//   raw_data          — payload original (objeto JSON)
// ---------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400, headers: CORS });
  }

  const full_name = (body.full_name as string | undefined)?.trim();
  if (!full_name) {
    return NextResponse.json({ error: "full_name es requerido" }, { status: 422, headers: CORS });
  }

  const cedula             = str(body.cedula);
  const date_of_birth      = str(body.date_of_birth);
  const age                = num(body.age);
  const gender             = oneOf(body.gender, ["male", "female"]);
  const last_seen_location = str(body.last_seen_location);
  const last_seen_date     = str(body.last_seen_date);
  const description        = str(body.description);
  const contact_name       = str(body.contact_name);
  const contact_phone      = str(body.contact_phone);
  const contact_email      = str(body.contact_email);
  const photo_url          = str(body.photo_url);
  const source_urls        = Array.isArray(body.source_urls)
    ? (body.source_urls as string[]).filter(s => typeof s === "string")
    : null;

  // Campos de fuente
  const source_name       = str(body.source_name) ?? str(body.reported_by_source) ?? "api";
  const source_base_url   = str(body.source_url) ?? "https://unknown";
  const source_type       = oneOf(body.source_type, ["html","api","form","social","manual"]) ?? "api";
  const source_record_id  = str(body.source_record_id);
  const source_record_url = str(body.source_record_url);
  const raw_data          = body.raw_data && typeof body.raw_data === "object" ? body.raw_data : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Upsert persona
    const personRes = await client.query(
      `INSERT INTO missing_persons
         (full_name, cedula, date_of_birth, age, gender,
          last_seen_location, last_seen_date, description,
          contact_name, contact_phone, contact_email,
          photo_url, reported_by_source, source_urls)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (cedula) WHERE cedula IS NOT NULL
       DO UPDATE SET
         full_name           = EXCLUDED.full_name,
         last_seen_location  = COALESCE(EXCLUDED.last_seen_location, missing_persons.last_seen_location),
         last_seen_date      = COALESCE(EXCLUDED.last_seen_date,     missing_persons.last_seen_date),
         description         = COALESCE(EXCLUDED.description,        missing_persons.description),
         photo_url           = COALESCE(EXCLUDED.photo_url,          missing_persons.photo_url),
         source_urls         = CASE
                                 WHEN EXCLUDED.source_urls IS NOT NULL
                                 THEN (SELECT ARRAY(SELECT DISTINCT unnest(
                                         COALESCE(missing_persons.source_urls, '{}') || EXCLUDED.source_urls)))
                                 ELSE missing_persons.source_urls
                               END,
         updated_at          = NOW()
       RETURNING id`,
      [full_name, cedula, date_of_birth, age, gender,
       last_seen_location, last_seen_date, description,
       contact_name, contact_phone, contact_email,
       photo_url, source_name, source_urls]
    );
    const person_id = personRes.rows[0].id;

    // 2. Upsert fuente
    const sourceRes = await client.query(
      `INSERT INTO sources (name, url, type)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url
       RETURNING id`,
      [source_name, source_base_url, source_type]
    );
    const source_id = sourceRes.rows[0].id;

    // 3. Registrar relación persona <-> fuente (si hay source_record_id)
    if (source_record_id) {
      await client.query(
        `INSERT INTO person_sources (person_id, source_id, source_record_id, source_url, raw_data)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_id, source_record_id)
         DO UPDATE SET
           person_id  = EXCLUDED.person_id,
           source_url = COALESCE(EXCLUDED.source_url, person_sources.source_url),
           raw_data   = COALESCE(EXCLUDED.raw_data,   person_sources.raw_data),
           scraped_at = NOW()`,
        [person_id, source_id, source_record_id, source_record_url, raw_data ? JSON.stringify(raw_data) : null]
      );
    }

    await client.query("COMMIT");

    // Devolver registro completo
    const final = await client.query(`SELECT * FROM missing_persons WHERE id = $1`, [person_id]);
    return NextResponse.json(final.rows[0], { status: 201, headers: CORS });

  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS });
  } finally {
    client.release();
  }
}

function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : null;
  return s || null;
}
function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function oneOf(v: unknown, allowed: string[]): string | null {
  return typeof v === "string" && allowed.includes(v) ? v : null;
}
