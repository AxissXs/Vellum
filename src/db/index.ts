import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// Build the pool without requiring DATABASE_URL at import time. At build
// (Next.js page-data collection) no DB vars exist yet, so we must not throw.
// Locally DATABASE_URL is set via .env; on Deno Deploy it (and PG* vars) are
// injected at runtime. Pool only opens a connection on first query.
const poolOptions = {
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  allowExitOnIdle: true,
} as const;

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  (() => {
    const databaseUrl = process.env.DATABASE_URL;
    const created = databaseUrl
      ? new Pool({ connectionString: databaseUrl, ...poolOptions })
      : new Pool(poolOptions);
    // Reuse across hot reloads (dev) and isolate reuse (Deno Deploy).
    globalForDb.__arenaNextJsPostgresqlPool = created;
    return created;
  })();

export const db = drizzle(pool);
