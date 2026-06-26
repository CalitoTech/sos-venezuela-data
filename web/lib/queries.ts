// Cached read queries used by Server Components. This file is intentionally
// NOT a "use server" module: a "use server" module may only export async
// functions, but these exports are constants and unstable_cache wrappers.
// Mutations and client-callable server actions live in actions.ts.

import { pool } from "./db";
import { unstable_cache } from "next/cache";

export const PAGE_SIZE = 100;

// Cache tag invalidated whenever a person is created or updated. Keeps the
// expensive COUNT(*) and stats aggregates off the hot path under traffic.
export const PERSONS_TAG = "persons";

// Total number of rows matching a query. Cached (60s + tag) because COUNT(*)
// over the full table on every home render and API hit is the costly part.
export const countPersons = unstable_cache(
  async (query: string): Promise<number> => {
    const client = await pool.connect();
    try {
      if (!query.trim()) {
        const res = await client.query<{ count: string }>(
          `SELECT COUNT(*) AS count FROM missing_persons`
        );
        return Number(res.rows[0].count);
      }
      const res = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM missing_persons
         WHERE cedula ILIKE $2
            OR full_name % $1
            OR full_name ILIKE $2`,
        [query, `%${query}%`]
      );
      return Number(res.rows[0].count);
    } finally {
      client.release();
    }
  },
  ["count-persons"],
  { tags: [PERSONS_TAG], revalidate: 60 }
);

export const getStats = unstable_cache(
  async () => {
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
  },
  ["stats"],
  { tags: [PERSONS_TAG], revalidate: 60 }
);
