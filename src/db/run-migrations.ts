import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "@/db";

function resolveMigrationsFolder(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const cwd = process.cwd();

  const candidates = [
    // Traced into standalone next to server (outputFileTracingIncludes)
    path.join(cwd, "drizzle"),
    path.join(cwd, "..", "drizzle"),
    path.join(cwd, "..", ".next", "standalone", "drizzle"),
    path.join(cwd, ".next", "standalone", "drizzle"),
    // Absolute Deno Deploy layouts (cwd often /app/src)
    "/app/.next/standalone/drizzle",
    "/app/drizzle",
    "/app/public/deploy/drizzle",
    path.join(cwd, "public", "deploy", "drizzle"),
    path.join(cwd, "..", "public", "deploy", "drizzle"),
    // Near compiled module
    path.join(moduleDir, "drizzle"),
    path.join(moduleDir, "..", "drizzle"),
    path.join(moduleDir, "..", "..", "drizzle"),
    path.join(moduleDir, "..", "..", "..", "drizzle"),
  ];

  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, "meta", "_journal.json"))) {
        return dir;
      }
    } catch {
      // ignore unreadable paths
    }
  }

  throw new Error(
    `Migrations folder not found (cwd=${cwd}). Checked: ${candidates.join(", ")}`,
  );
}

let migrationPromise: Promise<void> | null = null;

/** Apply pending Drizzle migrations. Safe to call multiple times. */
export function runMigrations() {
  migrationPromise ??= applyMigrations();
  return migrationPromise;
}

async function applyMigrations() {
  const migrationsFolder = resolveMigrationsFolder();
  console.log(`[db] Running migrations from ${migrationsFolder}`);

  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
  console.log("[db] Migrations complete");
}
