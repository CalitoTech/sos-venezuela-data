"use server";

import { pool } from "./db";
import { revalidatePath } from "next/cache";

export async function searchPersons(query: string) {
  const client = await pool.connect();
  try {
    if (!query.trim()) {
      const res = await client.query(
        `SELECT * FROM missing_persons ORDER BY first_seen_at DESC LIMIT 100`
      );
      return res.rows;
    }
    const res = await client.query(
      `SELECT *, similarity(full_name, $1) AS sim
       FROM missing_persons
       WHERE cedula ILIKE $2
          OR full_name % $1
          OR full_name ILIKE $2
       ORDER BY sim DESC, first_seen_at DESC
       LIMIT 100`,
      [query, `%${query}%`]
    );
    return res.rows;
  } finally {
    client.release();
  }
}

export async function getPersonById(id: string) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT * FROM missing_persons WHERE id = $1`,
      [id]
    );
    return res.rows[0] ?? null;
  } finally {
    client.release();
  }
}

export async function getStats() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'missing') AS missing,
        COUNT(*) FILTER (WHERE status = 'found')   AS found,
        COUNT(*)                                    AS total
       FROM missing_persons`
    );
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function createPerson(formData: FormData) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO missing_persons
        (full_name, cedula, date_of_birth, age, gender,
         last_seen_location, last_seen_date, description,
         contact_name, contact_phone, contact_email,
         photo_url, reported_by_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (cedula) WHERE cedula IS NOT NULL
       DO UPDATE SET
         full_name           = EXCLUDED.full_name,
         last_seen_location  = EXCLUDED.last_seen_location,
         last_seen_date      = EXCLUDED.last_seen_date,
         description         = EXCLUDED.description,
         contact_name        = EXCLUDED.contact_name,
         contact_phone       = EXCLUDED.contact_phone,
         contact_email       = EXCLUDED.contact_email,
         photo_url           = EXCLUDED.photo_url,
         updated_at          = NOW()`,
      [
        formData.get("full_name"),
        formData.get("cedula") || null,
        formData.get("date_of_birth") || null,
        formData.get("age") ? Number(formData.get("age")) : null,
        formData.get("gender") || null,
        formData.get("last_seen_location") || null,
        formData.get("last_seen_date") || null,
        formData.get("description") || null,
        formData.get("contact_name") || null,
        formData.get("contact_phone") || null,
        formData.get("contact_email") || null,
        formData.get("photo_url") || null,
        "manual",
      ]
    );
  } finally {
    client.release();
  }
  revalidatePath("/");
}

export async function updateStatus(id: string, status: string, notes: string) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE missing_persons SET status = $1, status_notes = $2 WHERE id = $3`,
      [status, notes, id]
    );
  } finally {
    client.release();
  }
  revalidatePath("/");
  revalidatePath(`/persona/${id}`);
}
