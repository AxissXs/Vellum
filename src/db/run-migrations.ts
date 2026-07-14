import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "@/db";

function resolveMigrationsFolder(): string {
  const candidates = [
    path.join(process.cwd(), "public", "deploy", "drizzle"),
    path.join(process.cwd(), "drizzle"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "meta", "_journal.json"))) {
      return dir;
    }
  }

  throw new Error(
    `Migrations folder not found. Checked: ${candidates.join(", ")}`,
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

  // Prisma Postgres / managed PG may not have pgcrypto enabled by default.
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
  console.log("[db] Migrations complete");
}
