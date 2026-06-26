"use server";

import { pool } from "./db";
import type { MissingPerson } from "./db";
import { revalidatePath, revalidateTag } from "next/cache";
import { publishToAll, type PublishInput } from "./publishers";
import { PAGE_SIZE, PERSONS_TAG } from "./queries";

export async function searchPersons(
  query: string,
  offset = 0
): Promise<MissingPerson[]> {
  const client = await pool.connect();
  try {
    if (!query.trim()) {
      const res = await client.query<MissingPerson>(
        `SELECT * FROM missing_persons
         ORDER BY first_seen_at DESC
         LIMIT $1 OFFSET $2`,
        [PAGE_SIZE, offset]
      );
      return res.rows;
    }
    const res = await client.query<MissingPerson>(
      `SELECT *, similarity(full_name, $1) AS sim
       FROM missing_persons
       WHERE cedula ILIKE $2
          OR full_name % $1
          OR full_name ILIKE $2
       ORDER BY sim DESC, first_seen_at DESC
       LIMIT $3 OFFSET $4`,
      [query, `%${query}%`, PAGE_SIZE, offset]
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

export async function createPerson(formData: FormData) {
  const full_name    = (formData.get("full_name") as string)?.trim();
  const cedula       = (formData.get("cedula") as string) || null;
  const age          = formData.get("age") ? Number(formData.get("age")) : null;
  const gender       = (formData.get("gender") as "male" | "female") || null;
  const location     = (formData.get("last_seen_location") as string) || null;
  const description  = (formData.get("description") as string) || null;
  const contact_name = (formData.get("contact_name") as string) || null;
  const contact_phone = (formData.get("contact_phone") as string) || null;
  const contact_email = (formData.get("contact_email") as string) || null;
  const photo_url    = (formData.get("photo_url") as string) || null;

  const client = await pool.connect();
  let personId: string;
  try {
    const res = await client.query<{ id: string }>(
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
         updated_at          = NOW()
       RETURNING id`,
      [
        full_name, cedula,
        formData.get("date_of_birth") || null,
        age, gender, location,
        formData.get("last_seen_date") || null,
        description, contact_name, contact_phone, contact_email,
        photo_url, "manual",
      ]
    );
    personId = res.rows[0].id;
  } finally {
    client.release();
  }

  const input: PublishInput = {
    full_name, cedula, age, gender, status: "missing",
    status_notes: null, found_by: null, found_contact: null, found_hospital: null,
    last_seen_location: location, description,
    photo_url, contact_name, contact_phone, contact_email,
  };

  await publishToAll(personId, input);

  revalidateTag(PERSONS_TAG, "max");
  revalidatePath("/");
}

export async function updateStatus(
  id: string,
  status: string,
  notes: string,
  found_by?: string,
  found_contact?: string,
  found_hospital?: string
) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE missing_persons
       SET status = $1, status_notes = $2, found_by = $3, found_contact = $4, found_hospital = $5
       WHERE id = $6`,
      [status, notes, found_by || null, found_contact || null, found_hospital || null, id]
    );
  } finally {
    client.release();
  }

  const person = await getPersonById(id);
  if (person) {
    const input: PublishInput = {
      full_name:          person.full_name,
      cedula:             person.cedula,
      age:                person.age,
      gender:             person.gender as "male" | "female" | null,
      last_seen_location: person.last_seen_location,
      description:        person.description,
      photo_url:          person.photo_url,
      contact_name:       person.contact_name,
      contact_phone:      person.contact_phone,
      contact_email:      person.contact_email,
      status:             status as "missing" | "found",
      status_notes:       notes || null,
      found_by:           found_by || null,
      found_contact:      found_contact || null,
      found_hospital:     found_hospital || null,
    };
    await publishToAll(id, input);
  }

  revalidateTag(PERSONS_TAG, "max");
  revalidatePath("/");
  revalidatePath(`/persona/${id}`);
}
