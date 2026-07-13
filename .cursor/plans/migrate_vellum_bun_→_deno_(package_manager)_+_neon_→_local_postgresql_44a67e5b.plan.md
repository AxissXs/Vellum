---
name: "Migrate Vellum: bun → deno (package manager) + Neon → local PostgreSQL"
overview: ""
todos: []
isProject: false
---

# Migrate Vellum: bun → deno (package manager) + Neon → local PostgreSQL

## Scope (confirmed with user)
- **Deno**: package-manager-only. Keep Node as the runtime for Next.js/Drizzle (no `deno run -A npm:next` experimentation). Scripts become `deno task` entries that invoke the Node binaries in `node_modules/.bin`/`./node_modules/<pkg>/...`.
- **Local Postgres**: config-only. `.env`/`.env.example` + drizzle config point at a local instance. No Docker.

## Why minimal
- DB layer (`src/db/index.ts`) already uses plain `pg` Pool + Drizzle — Neon appears ONLY in `.env.example` comments (`sslmode=require`, pooler/direct split). Existing `drizzle/` migrations are standard Postgres SQL → no schema/migration changes.
- No `Bun.*` runtime API anywhere in `src/`. Bun is used solely as `bun run <script>`.
- `drizzle.config.ts` already calls `dotenv.config({ path: ".env" })`, so the `dotenv -e .env --` prefixes in `package.json` are redundant and get dropped.
- `src/db/seed.ts` does NOT load `.env` itself (it relied on the `dotenv -e` prefix) → must add a `dotenv` load.

## Changes

### 1. `deno.json` (new)
Add Deno task config + bare `fmt/lint` off (let Next/ESLint own linting). Tasks map 1:1 to old bun scripts, invoking node binaries directly:
```json
{
  "tasks": {
    "dev": "node ./node_modules/next/dist/bin/next dev",
    "build": "node ./node_modules/next/dist/bin/next build",
    "start": "node ./node_modules/next/dist/bin/next start",
    "lint": "node ./node_modules/eslint/bin/eslint.js .",
    "typecheck": "node ./node_modules/typescript/bin/tsc --noEmit",
    "db:generate": "node ./node_modules/drizzle-kit/bin.cjs generate",
    "db:migrate": "node ./node_modules/drizzle-kit/bin.cjs migrate",
    "db:push": "node ./node_modules/drizzle-kit/bin.cjs push",
    "db:studio": "node ./node_modules/drizzle-kit/bin.cjs studio",
    "db:seed": "node ./node_modules/tsx/dist/cli.mjs src/db/seed.ts",
    "vercel:build": "node ./node_modules/drizzle-kit/bin.cjs generate && node ./node_modules/next/dist/bin/next build",
    "vercel:deploy": "node ./node_modules/drizzle-kit/bin.cjs migrate && node ./node_modules/vercel/dist/index.js --prod"
  },
  "fmt": { "exclude": ["**/*"] },
  "lint": { "exclude": ["**/*"] }
}
```
Note: `drizzle.config.ts` already loads `.env`, so no `dotenv` prefix needed.

### 2. `package.json`
- Delete the `scripts` block (Deno tasks own execution). Keep `dependencies`/`devDependencies` (Deno reads them for `deno install`/`deno add`).
- Remove devDeps no longer invoked by us: `dotenv-cli` (was only for `dotenv -e`), `cross-env` (unused in scripts). Keep `dotenv` (used by `drizzle.config.ts` and seed).
- `name`/`private` stay.

### 3. `src/db/seed.ts`
Add `import "dotenv/config";` (or `dotenv.config()`) at top so `DATABASE_URL` loads when run standalone via `deno task db:seed`.

### 4. `.env.example`
Replace Neon-specific block:
```bash
# Database (local PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vellum"
```
Remove the `DIRECT_DATABASE_URL` (Neon pooler) line + the `sslmode=require` / pooled-vs-direct comments.

### 5. `drizzle.config.ts`
- `dbCredentials.url` → `process.env.DATABASE_URL || ""` (drop `DIRECT_DATABASE_URL` dependency). Keep `dotenv.config`.

### 6. `.gitignore`
Add `bun.lock` to delete-list tracking; add `deno.lock`. (Keep `node_modules`.)

### 7. Cleanup
- Delete `bun.lock` (no longer used).
- `deno install` (or `deno add` per dep) to generate `deno.lock` from package.json deps.

### 8. Docs (per AGENTS.md checklist — STRUCTURE.md/AGENTS.md/TODO.md)
- `AGENTS.md`: "Package Manager: bun" → "deno (deno.json tasks)"; "Database: PostgreSQL (Neon)" → "PostgreSQL (local)"; all `bun run <x>` → `deno task <x>`; branching/commit flow untouched.
- `STRUCTURE.md`: root tree `bun.lock` → `deno.lock` + add `deno.json`; config-file note for `db:generate`/`db:seed` (no dotenv prefix, seed self-loads env); drop `DIRECT_DATABASE_URL` mention; "PostgreSQL (Neon)" → "PostgreSQL (local)".
- `README.md` + `CONTRIBUTIONS.md`: `bun install` → `deno install`; `bun run <x>` → `deno task <x>`; Neon → local Postgres.
- `TODO.md`: adjust any `bun run` references.

## Verification (run, do not just assert)
1. `deno install` succeeds; `deno.lock` created.
2. `deno task typecheck` → clean (same as `tsc --noEmit`).
3. `deno task lint` → clean.
4. `deno task db:migrate` applies against local Postgres (DATABASE_URL set).
5. `deno task db:seed` runs without "DATABASE_URL is required" error (env loads via dotenv).
6. `deno task build` succeeds.

## Out of scope
- No Turbopack/Deno-runtime execution (Node stays the runtime).
- No Docker / no schema or migration file changes.
- Vercel deploy path preserved but still invokes local binaries via Deno (unchanged semantics).
