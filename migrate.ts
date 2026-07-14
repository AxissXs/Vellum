/**
 * Drizzle migration runner for Deno Deploy pre-deploy.
 * Uses npm: specifiers so Deno can run without node_modules in the deploy partition.
 * Resolves drizzle/ relative to this file (not cwd).
 *
 * Deno Deploy pre-deploy: deno run -A public/deploy/migrate.ts
 * (copied into public/deploy/ during build — public/ is always in the deploy artifact)
 *
 * Runtime fallback: src/instrumentation.ts also runs migrations on server start.
 */
import { drizzle } from "npm:drizzle-orm@0.45.2/node-postgres";
import { migrate } from "npm:drizzle-orm@0.45.2/node-postgres/migrator";
import { Pool } from "npm:pg@8.20.0";
import { fromFileUrl, join } from "jsr:@std/path@1";

const root = fromFileUrl(new URL(".", import.meta.url));
const migrationsFolder = join(root, "drizzle");

const pool = Deno.env.get("DATABASE_URL")
  ? new Pool({ connectionString: Deno.env.get("DATABASE_URL") })
  : new Pool();

try {
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
