import { pool } from "@/lib/db";
import type { PublishInput, PublishResult, Publisher } from "./types";

export type { PublishInput, PublishResult };
import ayudavenezuela from "./ayudavenezuela";
import encuentralos from "./encuentralos";
import venezuelareporta from "./venezuelareporta";
import venezuelatebusca from "./venezuelatebusca";

const PUBLISHERS: Publisher[] = [
  ayudavenezuela,
  venezuelatebusca,
  venezuelareporta,
  encuentralos,
];

async function getExternalId(personId: string, sourceName: string): Promise<string | null> {
  const client = await pool.connect();
  try {
    const res = await client.query<{ source_record_id: string }>(
      `SELECT ps.source_record_id
       FROM person_sources ps
       JOIN sources s ON s.id = ps.source_id
       WHERE ps.person_id = $1 AND s.name = $2
       LIMIT 1`,
      [personId, sourceName]
    );
    return res.rows[0]?.source_record_id ?? null;
  } finally {
    client.release();
  }
}

async function saveExternalId(personId: string, publisher: Publisher, externalId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const src = await client.query<{ id: string }>(
      `INSERT INTO sources (name, url, type)
       VALUES ($1, $2, 'api')
       ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url
       RETURNING id`,
      [publisher.name, publisher.sourceUrl]
    );
    await client.query(
      `INSERT INTO person_sources (person_id, source_id, source_record_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (source_id, source_record_id) DO NOTHING`,
      [personId, src.rows[0].id, externalId]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function publishTo(personId: string, input: PublishInput, publisher: Publisher): Promise<PublishResult> {
  const base = { platform: publisher.name };
  try {
    // 1. ¿Ya publicamos esta persona en esta plataforma?
    const knownId = await getExternalId(personId, publisher.name);
    if (knownId) {
      if (publisher.update) {
        await publisher.update(knownId, input);
        return { ...base, action: "updated", external_id: knownId };
      }
      return { ...base, action: "skipped", external_id: knownId };
    }

    // 2. Buscar en la plataforma por cédula/nombre para no crear duplicados
    const foundId = await publisher.search(input);
    if (foundId) {
      await saveExternalId(personId, publisher, foundId);
      if (publisher.update) {
        await publisher.update(foundId, input);
        return { ...base, action: "updated", external_id: foundId };
      }
      return { ...base, action: "skipped", external_id: foundId };
    }

    // 3. Crear
    const newId = await publisher.create(input);
    await saveExternalId(personId, publisher, newId);
    return { ...base, action: "created", external_id: newId };
  } catch (err) {
    return { ...base, action: "error", error: String(err) };
  }
}

export async function publishToAll(personId: string, input: PublishInput): Promise<PublishResult[]> {
  const settled = await Promise.allSettled(
    PUBLISHERS.map((p) => publishTo(personId, input, p))
  );
  return settled.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { platform: "unknown", action: "error" as const, error: String(r.reason) }
  );
}
