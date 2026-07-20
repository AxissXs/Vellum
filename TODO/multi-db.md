# Multi-Database Provider Support

> **Priority:** Low
> **Status:** Pending
> **Estimated complexity:** Small
> **Depends on:** Nothing
> **Blocks:** None

---

## Overview

Currently, the project is tightly coupled to Neon PostgreSQL (with `-pooler` and direct connection URLs). This works well but locks teams into one provider. This task removes that coupling so Vellum works with any standard PostgreSQL-compatible database — local Postgres, AWS RDS, Supabase, DigitalOcean Managed Postgres, or self-hosted instances.

The goal is: **as long as it's PostgreSQL, Vellum should work with zero code changes.** Only the connection string and optional pooling configuration differ.

## Current State

- `DATABASE_URL` env var expects a pooled connection (Neon-specific `-pooler` suffix)
- `DIRECT_DATABASE_URL` expects a direct connection (Neon-specific, no `-pooler`)
- Drizzle config uses these env vars directly
- Some migrations or queries may implicitly assume Neon-specific behavior
- No documentation for non-Neon setups

## What Needs to Change

### 1. Environment Variables

Rename env vars to be provider-agnostic:

```bash
# BEFORE (Neon-specific)
DATABASE_URL=postgres://...-pooler.neon.tech/...
DIRECT_DATABASE_URL=postgres://....neon.tech/...

# AFTER (provider-agnostic)
DATABASE_URL=postgres://host:port/db?sslmode=require
# Optional: if your provider needs a separate direct connection for migrations
MIGRATE_DATABASE_URL=postgres://host:port/db?sslmode=require
```

Keep backward compatibility: if `DATABASE_URL` is set but `MIGRATE_DATABASE_URL` is not, use `DATABASE_URL` for both runtime and migrations.

### 2. Drizzle Configuration

Update `drizzle.config.ts` to use `MIGRATE_DATABASE_URL` (or fallback to `DATABASE_URL`):

```ts
// drizzle.config.ts
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL!,
  },
});
```

### 3. Connection Pool (`src/db/index.ts`)

The current Neon-specific pattern:
```ts
const pool = globalThis.__arenaNextJsPostgresqlPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
```

This already works with any PostgreSQL because `pg.Pool` is standard. However, we should:
- Add support for `sslmode=require` from the connection string
- Support `max` pool size configuration via env var
- Document that pooling is handled by `pg.Pool` and works with any Postgres

```ts
// Add to .env.example
DATABASE_URL=postgresql://user:pass@localhost:5432/vellum
# For providers that require SSL:
# DATABASE_URL=postgresql://user:pass@host:5432/vellum?sslmode=require
DATABASE_POOL_MAX=20
```

### 4. Provider-Specific Notes

Add a section to the install docs documenting known provider quirks:

| Provider | Notes |
|----------|-------|
| **Neon** | Use `-pooler` for runtime, non-pooler for migrations. SSL required. |
| **Local Postgres** | No SSL. Set `sslmode=disable` or omit SSL params. |
| **AWS RDS** | SSL recommended. May need `sslmode=require`. |
| **Supabase** | Use connection pooler URL for app, direct URL for migrations. |
| **DigitalOcean** | Managed Postgres, SSL required. Standard connection string. |
| **Docker Postgres** | No SSL internally. Map port 5432. |

### 5. Validation & Testing

- Add a `db:check` script that validates the connection on startup
- Test migrations against: local Postgres, Neon, and one other provider (e.g., Supabase or Docker)
- Document any migration incompatibilities

### 6. Documentation

Update `docs/INSTALL.md` (from `TODO/install-docs.md`) with database provider selection during install:

```bash
# Install script prompt:
? Choose your database provider:
  > Neon (serverless)
    Local PostgreSQL (Docker)
    Local PostgreSQL (native)
    AWS RDS
    Supabase
    Other (manual config)
```

## Files to Modify

| File | Change |
|------|--------|
| `.env.example` | Rename `DIRECT_DATABASE_URL` → `MIGRATE_DATABASE_URL`, add provider-agnostic examples, document `DATABASE_POOL_MAX` |
| `drizzle.config.ts` | Use `MIGRATE_DATABASE_URL` with fallback to `DATABASE_URL` |
| `src/db/index.ts` | Support `DATABASE_POOL_MAX` env var, document that any Postgres works |
| `README.md` | Remove Neon-specific language, say "PostgreSQL (any provider)" |
| `docs/INSTALL.md` | Add database provider selection and per-provider connection notes |
| `scripts/install.sh` | Add database provider prompt and generate appropriate connection strings |

## Files to Create

| File | Purpose |
|------|---------|
| `scripts/db-check.ts` | Validation script that tests DB connectivity and prints provider info |

## Acceptance Criteria

- [ ] `.env.example` uses provider-agnostic names (`MIGRATE_DATABASE_URL`)
- [ ] `drizzle.config.ts` works with any PostgreSQL provider
- [ ] `src/db/index.ts` connection pool works with local Postgres, Neon, and at least one other provider
- [ ] Install script prompts for database provider and generates correct connection strings
- [ ] Documentation lists tested providers and any known quirks
- [ ] Existing Neon users are not broken (backward compatibility: `DATABASE_URL` without `MIGRATE_DATABASE_URL` still works)
- [ ] `bun run lint`, `bun run typecheck`, `bun run build` all pass
- [ ] Migrations tested on local Postgres (Docker) and at least one cloud provider
