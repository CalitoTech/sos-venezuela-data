import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// CORS headers — API pública
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
// Body JSON — campos requeridos: full_name
// Deduplicación: cédula (si existe) o (full_name + date_of_birth)
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
  const reported_by_source = str(body.reported_by_source) ?? "api";
  const source_urls        = Array.isArray(body.source_urls)
    ? (body.source_urls as string[]).filter(s => typeof s === "string")
    : null;

  const client = await pool.connect();
  try {
    const res = await client.query(
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
                                 THEN (
                                   SELECT ARRAY(
                                     SELECT DISTINCT unnest(
                                       COALESCE(missing_persons.source_urls, '{}') || EXCLUDED.source_urls
                                     )
                                   )
                                 )
                                 ELSE missing_persons.source_urls
                               END,
         updated_at          = NOW()
       RETURNING *`,
      [full_name, cedula, date_of_birth, age, gender,
       last_seen_location, last_seen_date, description,
       contact_name, contact_phone, contact_email,
       photo_url, reported_by_source, source_urls]
    );

    return NextResponse.json(res.rows[0], { status: 201, headers: CORS });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS });
  } finally {
    client.release();
  }
}

// helpers
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
