import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    const res = await client.query("SELECT 1 AS ok");
    client.release();
    await pool.end();
    return NextResponse.json({ ok: true, result: res.rows[0] });
  } catch (err: unknown) {
    await pool.end().catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({ error: msg, stack, url_prefix: url.slice(0, 40) }, { status: 500 });
  }
}
