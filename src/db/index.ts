import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// Build the pool without requiring DATABASE_URL at import time. At build
// (Next.js page-data collection) no DB vars exist yet, so we must not throw.
// Locally DATABASE_URL is set via .env; on Deno Deploy it (and PG* vars) are
// injected at runtime. Pool only opens a connection on first query.
export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  (() => {
    const databaseUrl = process.env.DATABASE_URL;
    const created = databaseUrl
      ? new Pool({ connectionString: databaseUrl })
      : new Pool();
    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = created;
    }
    return created;
  })();

export const db = drizzle(pool);
