# Setup & Update Flow Improvements

> **Priority:** Medium
> **Status:** Pending
> **Estimated complexity:** Medium
> **Depends on:** Feature flags system (for system seeding), Migration workflow (for runtime migrations)
> **Blocks:** None

---

## Overview

Vellum's current first-time setup (`/setup` page) only creates an admin user and a first team. It does not handle environment configuration, and there's no in-app update mechanism for users who install on shared hosting or environments without terminal access. This task improves the setup experience and builds a runtime update/migration flow that works without CLI.

## Current State

- `/setup` page: Creates initial superadmin + first team + first project. Only runs when `users` table is empty.
- `bootstrap.ts`: Auto-seeds minimal demo data on the **first API call** (`ensureDemoData()`). Mixes demo data and system data.
- `db:seed`: Full demo dataset (8 users, 30+ tasks) — manual, one-off.
- No `.env` generation during setup.
- No runtime migration path: if schema changes after deployment, users must run `db:migrate` manually.

## Problems

1. Shared hosting users can't run terminal commands for migrations.
2. Demo seed and system seed (feature flags, default settings) are conflated in `bootstrap.ts`.
3. Setup page doesn't configure database/environment — assumes `.env` is pre-populated.
4. No notification or UI when the app is out of date vs. the latest schema.

## Goals

1. **Separate system seeds from demo seeds** — System seeds (feature flags, platform defaults) must always run on a fresh DB. Demo seeds are optional and distinct.
2. **Enhanced setup page** — Optionally collect and write database credentials and core env vars during setup (for self-hosted users).
3. **Runtime schema migration check** — On app startup (or admin dashboard load), detect if the DB schema is behind the app version and offer to run migrations in-app.
4. **Update/migration script** — An `update.sh` script for server users that pulls, runs migrations, restarts. Complements the in-app flow.

## Database Changes

None. This is a code and workflow change.

## API Routes

### `GET /api/setup/status`

Returns the current setup state of the app:

```json
{
  "initialized": true,
  "needsMigration": false,
  "dbVersion": "0013",
  "appVersion": "1.8.0",
  "usersCount": 5
}
```

- `initialized`: true if `users` table has at least one row
- `needsMigration`: true if `drizzle/meta/_journal.json` has entries not yet applied
- `dbVersion`: latest migration tag found in `_journal.json` (read from DB or file)
- `usersCount`: number of existing users

### `POST /api/setup/complete`

Extends the existing `/api/setup` POST. Accepts additional optional fields:

```json
{
  "name": "Alex Morgan",
  "email": "alex@vellum.app",
  "password": "...",
  "teamName": "Engineering",
  "generateEnv": true,
  "envVars": {
    "DATABASE_URL": "postgresql://...",
    "NEXTAUTH_SECRET": "..."
  }
}
```

If `generateEnv` is true, writes a `.env` file to the project root with the provided vars plus sensible defaults (random secret, app URL). Only works if the server has write access and `.env` does not already exist.

### `POST /api/super-admin/migrate`

**Superadmin-only.** Runs pending migrations programmatically (no CLI).

```json
{ "dryRun": false }
```

Response:
```json
{
  "success": true,
  "migrationsApplied": ["0013_slim_dark_phoenix"],
  "message": "Applied 1 migration"
}
```

Uses `drizzle-kit` programmatic API (or spawns `npm run db:migrate` in a controlled way). Logs to `activity_logs`.

**Safety:** Only runs if `needsMigration` is true. Blocks concurrent runs with an in-memory lock.

## UI Changes

### Setup Page Enhancements (`src/app/setup/page.tsx`)

- **Step 1 (optional) — Environment**: If `.env` is missing, show inputs for `DATABASE_URL`, `NEXTAUTH_SECRET`, and `APP_URL`. Generate a random `NEXTAUTH_SECRET`. Write `.env` on submit.
- **Step 2 — Admin**: Existing admin creation form.
- **Step 3 — Team**: Existing team/project creation.
- **Step 4 — Seed choice**: Checkbox "Seed demo data" (unchecked by default). Demo data is optional; system seeds (feature flags) run unconditionally.

### Superadmin Dashboard — Migration Alert

- If `needsMigration` is true, show a persistent amber banner at the top of the superadmin dashboard:
  > ⚠️ Database schema is out of date. Run migration to apply pending changes.
  > `[Run Migration]` button → calls `POST /api/super-admin/migrate`
- Post-migration, banner disappears, toast shows success with list of applied migrations.

## Seeding Refactor

### `src/db/system-seed.ts`

New module that seeds **system-required** data (no demo content):

```ts
export async function seedSystemData() {
  await seedFeatureFlags();   // Already exists in bootstrap.ts — extract
  // Future: platform_settings defaults, notification preference defaults, etc.
}
```

### `src/db/demo-seed.ts`

Extract demo seeding from `bootstrap.ts` into a standalone module:

```ts
export async function seedDemoData() {
  // Current bootstrap.ts demo user/task/team creation
}
```

### `src/db/bootstrap.ts`

Refactored to:

```ts
export async function ensureSystemData() {
  // Always idempotent — seeds feature flags, etc.
}

export async function ensureDemoData() {
  // Only if users table is empty AND explicitly requested
}
```

- `ensureSystemData()` called on **every app startup** (or first API call) — safe to rerun.
- `ensureDemoData()` called only during setup when "Seed demo data" is checked.

## Files to Create

| File | Purpose |
|------|---------|
| `TODO/setup-and-update.md` | This document |
| `src/db/system-seed.ts` | System-required seeds (feature flags, defaults) |
| `src/db/demo-seed.ts` | Demo dataset (extracted from bootstrap.ts) |
| `src/app/api/setup/status/route.ts` | GET setup/migration status |
| `src/app/api/super-admin/migrate/route.ts` | POST run migrations in-app |
| `scripts/update.sh` | Pull latest, run migrations, restart for server users |

## Files to Modify

| File | Change |
|------|---------|
| `src/db/bootstrap.ts` | Split into system-seed + demo-seed calls; extract to new modules |
| `src/app/setup/page.tsx` | Add env var collection, demo seed checkbox, multi-step flow |
| `src/app/api/setup/route.ts` | Extend POST to accept `generateEnv` and `envVars` |
| `src/app/dashboard/super-admin/SuperAdminClient.tsx` | Add migration alert banner when needed |
| `AGENTS.md` | Document the seeding convention: system vs. demo |
| `STRUCTURE.md` | Add new files |

## Migration Strategy

1. Extract `seedFeatureFlags()` and future system seeds into `src/db/system-seed.ts`
2. Extract demo data into `src/db/demo-seed.ts`
3. Refactor `bootstrap.ts` to call both, conditionally
4. Build `GET /api/setup/status` for migration detection
5. Enhance setup page with env config and demo seed toggle
6. Build `POST /api/super-admin/migrate` with safety locks
7. Add migration alert banner to superadmin dashboard
8. Write `scripts/update.sh`
9. Lint, typecheck, build → ship

## Acceptance Criteria

- [ ] System seeds (feature flags) run automatically on fresh DB without demo data
- [ ] Demo seeds are optional and triggered only from setup page checkbox
- [ ] Setup page can generate `.env` when missing (self-hosted scenario)
- [ ] `GET /api/setup/status` accurately reports `needsMigration`
- [ ] Superadmin sees amber migration banner when DB is behind
- [ ] `POST /api/super-admin/migrate` applies pending migrations safely
- [ ] `scripts/update.sh` works on Ubuntu 22.04+ to pull, migrate, restart
- [ ] No existing functionality broken (setup still works, bootstrap still seeds)
- [ ] `bun run lint`, `bun run typecheck`, `bun run build` all pass
