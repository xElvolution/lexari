import { Pool } from "pg";

/**
 * Neon Postgres. One pool per process; Neon requires TLS.
 * DATABASE_URL: postgres://user:pass@…neon.tech/db?sslmode=require
 */

let pool: Pool | null = null;

export function db(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set (Neon Postgres)");
    pool = new Pool({
      connectionString: url,
      max: 5,
      ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}
