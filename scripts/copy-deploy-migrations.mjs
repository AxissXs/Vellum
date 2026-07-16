/**
 * After `next build`, place migration runner inside `.next/standalone/`.
 *
 * Deno Deploy Next.js pre-deploy cwd = `/app/src`. Artifact only keeps
 * `.next/standalone/` (root `.next/migrate.ts` is stripped). So migrate
 * MUST live under standalone.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function cpRecursive(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function writeMigrateBundle(destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(
    path.join(projectRoot, "migrate.ts"),
    path.join(destDir, "migrate.ts"),
  );
  cpRecursive(
    path.join(projectRoot, "drizzle"),
    path.join(destDir, "drizzle"),
  );
}

const standaloneRoot = path.join(projectRoot, ".next", "standalone");
if (!fs.existsSync(standaloneRoot)) {
  console.error("[copy-deploy-migrations] FATAL: .next/standalone missing after build");
  process.exit(1);
}

// 1) Always at standalone root (pre-deploy looks here — ONLY .next subtree
//    Deno Deploy keeps for Next.js; cwd at pre-deploy is /app/src)
writeMigrateBundle(standaloneRoot);
const migratePath = path.join(standaloneRoot, "migrate.ts");
const journalPath = path.join(standaloneRoot, "drizzle", "meta", "_journal.json");
if (!fs.existsSync(migratePath) || !fs.existsSync(journalPath)) {
  console.error(
    "[copy-deploy-migrations] FATAL: standalone migrate bundle incomplete",
    { migratePath, journalPath },
  );
  process.exit(1);
}
console.log("[copy-deploy-migrations] wrote .next/standalone/{migrate.ts,drizzle/}");

// 2) public/deploy for runtime instrumentation when public/ is served
writeMigrateBundle(path.join(projectRoot, "public", "deploy"));
console.log("[copy-deploy-migrations] wrote public/deploy/{migrate.ts,drizzle/}");

// 3) Next to every server.js (nested tracing roots e.g. rnd/Vellum/...)
function findServerDirs(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isFile() && ent.name === "server.js") acc.push(dir);
    else if (ent.isDirectory() && ent.name !== "node_modules") {
      findServerDirs(full, acc);
    }
  }
  return acc;
}

for (const dir of findServerDirs(standaloneRoot)) {
  writeMigrateBundle(dir);
  const pub = path.join(projectRoot, "public");
  if (fs.existsSync(pub)) {
    cpRecursive(pub, path.join(dir, "public"));
  }
  console.log(
    `[copy-deploy-migrations] synced into ${path.relative(projectRoot, dir)}`,
  );
}
