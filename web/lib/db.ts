import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export interface MissingPerson {
  id: string;
  full_name: string;
  cedula: string | null;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  last_seen_location: string | null;
  last_seen_date: string | null;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  photo_url: string | null;
  status: "missing" | "found" | "deceased" | "unknown";
  status_notes: string | null;
  reported_by_source: string | null;
  source_urls: string[] | null;
  first_seen_at: string;
  updated_at: string;
}
