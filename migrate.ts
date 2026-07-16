/**
 * Deno Deploy pre-deploy migrator (no deno.json / node_modules required).
 *
 * Next.js pre-deploy partition: cwd=/app/src, artifact only keeps
 * `.next/standalone/`. Build copies this file + drizzle/ there.
 *
 * Pre-deploy: deno run -A /app/.next/standalone/migrate.ts
 * (from /app/src: ../.next/standalone/migrate.ts)
 *
 * Uses npm: specifiers so Deno fetches deps — drizzle-kit cannot run here
 * (`node` on Deploy is a Deno shim; ./node_modules is missing).
 */
import { drizzle } from "npm:drizzle-orm@0.45.2/node-postgres";
import { migrate } from "npm:drizzle-orm@0.45.2/node-postgres/migrator";
import { Pool } from "npm:pg@8.20.0";
import { fromFileUrl, join } from "jsr:@std/path@1";

const root = fromFileUrl(new URL(".", import.meta.url));
const migrationsFolder = join(root, "drizzle");

const databaseUrl = Deno.env.get("DATABASE_URL");
if (!databaseUrl) {
  console.error("DATABASE_URL is not set (needed for pre-deploy migrations)");
  Deno.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  console.log(`cwd=${Deno.cwd()}`);
  console.log(`Running migrations from ${migrationsFolder}`);
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete");
} catch (error) {
  console.error("Migration failed:", error);
  Deno.exit(1);
} finally {
  await pool.end();
}
