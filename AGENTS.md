# AI Agent Instructions for Vellum

This document provides guidance for AI agents working on the Vellum project.

## Project Overview

**Vellum** (product UI brand: **Perfect**) is a Next.js 16 (App Router) team management platform with:

- PostgreSQL database using Drizzle ORM
- Kanban boards for project management
- Role-based authentication (superadmin, admin, member)
- Team and project organization
- Task tracking with priorities, statuses, comments
- Activity logging
- Whitelabel-ready branding via [`src/lib/brand.ts`](src/lib/brand.ts) (`NEXT_PUBLIC_BRAND_*` overrides)

## Tech Stack

- **Framework**: Next.js 16.2.6 (App Router, React 19, Turbopack)
- **Database**: PostgreSQL (local) with Drizzle ORM 0.45.2
- **Auth**: Custom session-based auth with bcryptjs
- **Styling**: Tailwind CSS 4.1.17
- **Language**: TypeScript 5.9.3
- **Package Manager**: deno (tasks in `deno.json`, deps in `package.json`)

## Key Commands

All commands run via `deno task <name>`. Deno invokes the Node binaries in `node_modules` (Node remains the runtime for Next.js/Drizzle).

```bash
# Setup
deno install             # Install deps from package.json, generate deno.lock

# Development
deno task dev            # Start dev server (Turbopack)

# Database
deno task db:generate    # Generate migrations from schema.ts
deno task db:push        # Push schema directly (no migration files) - use for fresh local DB
deno task db:migrate     # Apply migrations to database
deno task db:studio      # Open Drizzle Studio
deno task db:seed        # Seed database with demo data

# Code Quality
deno task lint           # ESLint
deno task typecheck      # TypeScript check

# Build & Deploy
deno task build          # Production build (Turbopack, standalone for Deno Deploy)
deno task start          # Start production server
deno task db:deploy      # Local: deno run migrate.ts (same runner as Deploy predeploy)
deno task deploy         # CLI deploy via deployctl (GitHub integration is preferred)
```

## Deploying to Deno Deploy (Production)

Vellum deploys to **Deno Deploy** with a managed **Prisma Postgres** database.

1. Create a Deno Deploy project and link the GitHub repo (Next.js is auto-detected).
2. Provision Prisma Postgres: `deno deploy database provision vellum-pg --kind prisma --region <region>`, then assign to the app. **Colocate with Deno Deploy app region** (prod edge today: ORD / Chicago). Warm `/api/health` ≫ ~50ms usually means DB is far from the edge — run `deno task db:colocate-check`.
3. Deno Deploy auto-injects `DATABASE_URL` (plus `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`) per environment — do NOT set `DATABASE_URL` in prod.
4. App config lives in [`deno.json`](deno.json) `deploy` key (overrides dashboard).
5. **Migrations on Deno Deploy**: Pre-deploy partition (cwd `/app/src`) has **no** `node_modules`, `deno.json`, or accessible `.next/` tree — `node …/drizzle-kit`, `deno task`, and `deno run -A .next/standalone/migrate.ts` all fail there. **Do not use `deploy.predeploy`**. Migrations run on **server boot** via [`src/instrumentation.ts`](src/instrumentation.ts) → [`src/db/run-migrations.ts`](src/db/run-migrations.ts). Build traces `drizzle/**/*` into standalone via `outputFileTracingIncludes`; `copy-deploy-migrations.mjs` also copies them. If migration fails, boot throws → Deno Deploy won't route traffic (safe). Local: `deno task db:migrate` / `db:push` use drizzle-kit as usual.
6. Add non-injected env vars: `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`.
7. Deno Deploy serves the app via `jsr:@deno/nextjs-start/v16` (`next start` on the Node runtime). Do NOT set `runtime = "edge"` on routes — `pg` needs the Node runtime.

Note: `drizzle.config.ts` skips loading `.env` in production so the injected `DATABASE_URL` is used. Demo seeding (`ensureDemoData`) is disabled in production.

### Deno Deploy build pitfalls (do not regress)

Prod build uses **Turbopack** (`deno task build` → `next build`, no `--webpack`). Deno Deploy build containers have ~**3GB** build RAM and **768MB** runtime. Agents must preserve these rules:

#### 1. Prefer Turbopack for prod builds — do not force webpack

Webpack on Deno Deploy previously failed page-data collect with:

```
TypeError: i[a] is not a function
Failed to collect page data for /_not-found  # or /login, /api/activity, …
```

Cause: Deno’s Node compat (`ext:core`) + 1-worker webpack page-data loading **shared server chunks**. Workarounds (`splitChunks: false`, `--max-old-space-size=8192`) either broke collect or **OOM’d** (exit 137) under the 3GB build limit.

**Current policy:** default Turbopack build. Do **not** add `--webpack` unless Deploy Turbopack regresses and a verified webpack fix fits in 3GB.

#### 2. Never pull Node-only / DB code into Client Components

`pg`, `bcryptjs`, `web-push`, `pusher` must stay server-only. They are listed in `serverExternalPackages` in [`next.config.ts`](next.config.ts).

**Import chain that breaks the browser (and sometimes Deploy page-data):**

`ClientComponent` → shared lib → `@/db` / `platform-settings` → `pg` → `Can't resolve 'dns'|'fs'|'net'|'tls'`

**Pattern:** split client-safe helpers from server-only DB accessors.

- Client-safe: [`src/lib/timezone.ts`](src/lib/timezone.ts), [`src/lib/holidays/index.ts`](src/lib/holidays/index.ts)
- Server-only: [`src/lib/timezone-server.ts`](src/lib/timezone-server.ts), [`src/lib/holidays-server.ts`](src/lib/holidays-server.ts)

Same rule for any new platform setting that reads Postgres.

#### 3. Keep `/_not-found` and `/_global-error` dependency-free

Still required for reliable prerender / page-data on Deploy:

- [`src/app/not-found.tsx`](src/app/not-found.tsx) — inline styles only; **no** `next/link`, brand, CSS modules, providers, or `@/db`
- [`src/app/global-error.tsx`](src/app/global-error.tsx) — own `<html>`/`<body>`; **no** app layout, brand, CSS, or providers

**Do NOT:**

- Force `--webpack` “for stability” without verifying Deploy under the 3GB build / 768MB runtime limits
- Add `optimization.splitChunks = false` for server (webpack-era hack — OOM on Deploy)
- Remove `bcryptjs` / `pg` from `serverExternalPackages`
- “Improve” not-found/global-error with Tailwind, Link, lucide, or shared UI kits

#### 4. Login / auth page-data

Prefer dynamic imports for `@/db` on pages that must stay out of static graphs (see [`src/app/login/page.tsx`](src/app/login/page.tsx)). Keep bcrypt usage server-side and dynamically imported where needed.

#### 5. Verify before claiming Deploy-ready

After touching `next.config.ts`, `not-found.tsx`, `global-error.tsx`, root `layout.tsx`, `deno.json` build task, or anything that can reach `pg`/`bcryptjs` from a page module:

```bash
deno task build
```

Confirm build past “Collecting page data” / “Generating static pages”. Local success is necessary; then confirm Deno Deploy revision succeeds (CLI/`deno task deploy` or GitHub integration).

## Environment Variables

Required in `.env`:

- `DATABASE_URL` - Local PostgreSQL connection string (e.g. `postgresql://postgres:postgres@localhost:5555/vellum`). On Deno Deploy this is injected automatically by the Prisma Postgres integration.

Web Push (VAPID) — optional; push no-ops when unset:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Public VAPID key (client subscribe)
- `VAPID_PRIVATE_KEY` - Private VAPID key (server send)
- `VAPID_SUBJECT` - Contact URI (e.g. `mailto:admin@example.com`)

Telegram webhook URL (optional if admin saves settings from the browser — uses `window.location.origin`):

- `NEXT_PUBLIC_APP_URL` - Public app origin (preferred for auto `setWebhook`)
- `APP_URL` - Fallback origin if `NEXT_PUBLIC_APP_URL` unset

> **Local Postgres < 13**: `gen_random_uuid()` is not built-in. Enable the extension once per database:
> `CREATE EXTENSION IF NOT EXISTS pgcrypto;` (the schema uses `gen_random_uuid()` for IDs).

## Agent Workflow

### Picking a Task

1. Check `TODO.md` for available tasks
2. Prefer tasks marked `priority: high` or `status: pending`
3. Look for tasks with clear acceptance criteria

### Executing a Task

1. **Pull latest updates** — Before doing anything, run `git checkout master && git pull origin master` to ensure you have the most recent codebase. This prevents working on stale files and reduces merge conflicts.
2. **Re-read project docs** — After pulling, re-read `AGENTS.md` and `STRUCTURE.md` to check for new conventions, updated patterns, or recently added features. This prevents reinventing the wheel or missing important workflow changes.
3. **Create a branch** — Create a feature branch from the latest `master` following the branch naming conventions outlined in the **Branching Strategy** section below.
4. **Read relevant files** — Understand existing patterns before modifying. **Always read `STRUCTURE.md` first** as your map of what's already built, then explore the actual source files (src/) to understand implementation details.
5. **Follow conventions** — Match existing code style, naming, patterns
6. **Write tests/verify** — Run `deno task lint`, `deno task typecheck`, `deno task build`
7. **Update documentation** — Update `TODO.md`, `STRUCTURE.md`, `AGENTS.md` if applicable (see checklist below)
8. **Check for overlap** — Check `TODO.md` to see if completing this task also resolves other pending tasks; mark them as done to avoid rework
9. Stage changes: `git add -A`
10. Commit with conventional message
11. Push: `git push`

### Documentation Update Checklist

**Any agent that adds, removes, or renames files must update these docs:**

- [ ] `TODO.md` — Mark completed tasks as done, add new tasks if discovered
- [ ] `STRUCTURE.md` — Update file listings, exports, descriptions, and purposes
- [ ] `AGENTS.md` — Update conventions, workflow, or infrastructure instructions if behavior changes

**How to keep STRUCTURE.md accurate:**
1. Add new files/directories to the tree listing in the "Source Code (`src/`)" section
2. Add or update the "File Details" section for any new/modified module
3. Update API route tables when adding/modifying endpoints
4. Update the Data Flow diagram if auth or request flow changes
5. Update the Hooks table when adding new React Query hooks
6. Update the Lib table when adding new utilities

> **Reminders for STRUCTURE.md:**
> - The tree view must reflect the actual `src/` directory structure
> - Every exported function/type listed must actually exist in the code
> - Component props signatures must match the actual component interface
> - API route method signatures must match the actual route handlers

### Code Conventions

- **Components**: PascalCase, client components marked with `"use client"`
- **API Routes**: `route.ts` in `src/app/api/...`
- **Database**: Schema in `src/db/schema.ts`, migrations in `drizzle/`
- **Auth**: Use `getSession()` from `src/lib/auth.ts` in server components
- **Permissions**: Use `hasPermission` / `requirePermission` from `src/lib/permissions.ts` for entity CRUD (projects, tasks, sprints). Matrix is also shown in Super Admin → Roles.
- **Imports**: Use `@/` path alias for `src/`

### Common Patterns

**Server Components** (default):

```tsx
import { getSession } from "@/lib/auth";
import { db } from "@/db";

export default async function Page() {
  const session = await getSession();
  // ...
}
```

**Client Components**:

```tsx
"use client";
import { useState } from "react";
```

**API Routes**:

```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ...
}
```

### Database Changes

1. Modify `src/db/schema.ts`
2. Run `deno task db:generate` to create migration
3. Run `deno task db:push` (fresh local DB) or `deno task db:migrate` to apply
4. Commit both schema and migration files

### Seeding Data

- `seed.ts` - Full demo data (run manually with `deno task db:seed`)
- `bootstrap.ts` - Minimal demo data (auto-runs on first API call via `ensureDemoData()`)

## Commit Message Format

Use conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

Examples:

- `feat(kanban): add drag-and-drop task reordering`
- `fix(auth): handle expired session cleanup`
- `db: add project_milestones table`

## Branching Strategy (required for all AI agents)

We use a feature-branch workflow to keep `master` stable and make code review easy.

### 1. Create a feature branch

Before starting any task, create a branch from the latest `master`:

```bash
git checkout master
git pull origin master
git checkout -b <branch-name>
```

**Branch naming convention:**

- `feat/<short-description>` — New features  
  e.g. `feat/notifications-bell`
- `fix/<short-description>` — Bug fixes  
  e.g. `fix/kanban-add-task-button`
- `refactor/<short-description>` — Code refactoring  
  e.g. `refactor/auth-middleware`
- `chore/<short-description>` — Tooling, deps, docs updates  
  e.g. `chore/update-tailwind`
- `hotfix/<short-description>` — Urgent production fixes  
  e.g. `hotfix/login-crash`

### 2. Work on the branch

- Make focused, atomic commits with conventional messages (see above).
- Run `deno task lint`, `deno task typecheck`, and `deno task build` before pushing.
- Keep the branch up-to-date with `master` via `git pull origin master` if it drifts.

### 3. Push the branch

```bash
git push -u origin <branch-name>
```

### 4. Merge back to master

When the task is done and verified, merge the branch into `master`:

```bash
git checkout master
git merge --no-ff <branch-name>
git push origin master
```

Then delete the merged branch:

```bash
git branch -d <branch-name>      # local
git push origin --delete <branch-name>   # remote
```

> **Do not push directly to `master`.** All work must go through a feature branch.

## File Structure Reference

See `STRUCTURE.md` for detailed file/folder structure with exports and purposes.

## Database Schema Reference

See `src/db/schema.ts` for:

- Tables: `users`, `teams`, `team_members`, `projects`, `project_milestones`, `project_notes`, `tasks`, `comments`, `sessions`, `activity_logs`, `notifications`, `push_subscriptions`, `notification_preferences`, `telegram_pairing_codes`, `platform_settings`, `schedule_events`
- Enums: `user_role`, `task_status`, `task_priority`, `notification_event_type`, `schedule_type`, `schedule_visibility`
- Relations defined via Drizzle references

## API Routes Reference

| Route                                   | Methods            | Description                    |
| --------------------------------------- | ------------------ | ------------------------------ |
| `/api/auth/login`                       | POST               | User login                     |
| `/api/auth/logout`                      | POST               | User logout                    |
| `/api/auth/me`                          | GET                | Current user session           |
| `/api/users`                            | GET, POST          | List/create users              |
| `/api/users/[id]`                       | GET, PATCH, DELETE | User CRUD                      |
| `/api/teams`                            | GET, POST          | List/create teams              |
| `/api/teams/[id]`                       | GET, PATCH, DELETE | Team CRUD                      |
| `/api/teams/[id]/members`               | GET, POST          | Team members                   |
| `/api/projects`                         | GET, POST          | List/create projects           |
| `/api/projects/[id]`                    | GET, PATCH, DELETE | Project CRUD                   |
| `/api/projects/[id]/milestones`         | GET, POST          | Project milestones             |
| `/api/tasks`                            | GET, POST          | List/create tasks              |
| `/api/tasks/[id]`                       | GET, PATCH, DELETE | Task CRUD                      |
| `/api/sprints`                          | GET, POST          | List/create sprints            |
| `/api/sprints/[id]`                     | GET, PATCH, DELETE | Sprint CRUD                    |
| `/api/sprints/[id]/burndown`            | GET                | Burndown chart data            |
| `/api/standups`                         | GET, POST          | List/upsert standups           |
| `/api/retros`                           | GET, POST          | List/create retro items        |
| `/api/retros/[id]`                      | PATCH, DELETE      | Retro item CRUD                |
| `/api/comments`                         | GET, POST          | Task comments                  |
| `/api/comments/[id]`                    | PATCH, DELETE      | Comment CRUD                   |
| `/api/notifications`                    | GET                | List in-app notifications      |
| `/api/notifications/[id]`               | PATCH              | Mark notification read         |
| `/api/notifications/mark-all-read`      | POST               | Mark all notifications read    |
| `/api/push/subscribe`                   | POST, DELETE       | Web Push subscribe/unsubscribe |
| `/api/push/preferences`                 | GET, PATCH         | Notification channel prefs     |
| `/api/telegram/status`                  | GET                | Telegram link status           |
| `/api/telegram/pairing-code`            | GET                | Generate Telegram pairing code |
| `/api/telegram/unlink`                  | DELETE             | Unlink Telegram account        |
| `/api/telegram/webhook`                 | POST               | Telegram bot webhook (secret)  |
| `/api/telegram/config`                  | GET                | Public bot configured + username |
| `/api/super-admin/users`                | GET                | Super-admin user list          |
| `/api/super-admin/users/[id]`           | PATCH              | Update user status/role        |
| `/api/super-admin/activity`             | GET                | Live user activity feed        |
| `/api/super-admin/sessions`             | GET                | List active sessions           |
| `/api/super-admin/sessions/[id]`        | DELETE             | Revoke session                 |
| `/api/super-admin/audit`                | GET                | Filterable audit logs          |
| `/api/super-admin/audit/export`         | GET                | Export audit logs (csv/pdf)    |
| `/api/super-admin/health`               | GET                | System health metrics          |
| `/api/super-admin/permissions`          | GET                | Role/permission matrix         |
| `/api/super-admin/telegram/settings`    | GET, PATCH         | Telegram bot settings + webhook |
| `/api/super-admin/telegram/topics`      | POST               | Create forum topic in supergroup |
| `/api/super-admin/telegram/stats`       | GET                | Telegram usage stats           |
| `/api/super-admin/telegram/test`        | POST               | Send Telegram test message     |
| `/api/activity`                         | GET                | Activity logs                  |
| `/api/calendar`                         | GET                | Aggregated calendar (schedules, activity, tasks, holidays) |
| `/api/schedules`                        | POST               | Create schedule event          |
| `/api/schedules/[id]`                   | PATCH, DELETE      | Update/delete schedule         |
| `/api/timezone`                         | GET                | Platform app timezone          |
| `/api/super-admin/timezone`             | GET, PATCH         | Super-admin get/set timezone   |
| `/api/super-admin/holidays`             | GET, PATCH         | Super-admin get/set holiday country |
| `/api/stats`                            | GET                | Dashboard statistics           |
| `/api/health`                           | GET                | Health check                   |

## React Query Optimistic Updates Pattern

All mutations use React Query hooks with optimistic updates. Pattern (see `src/hooks/useComments.ts`):

```ts
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      const res = await api.post("/api/comments", input);
      return res.comment;
    },
    onMutate: async (newComment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["comments", newComment.taskId],
      });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData([
        "comments",
        newComment.taskId,
      ]);

      // Optimistically update
      queryClient.setQueryData(["comments", newComment.taskId], (old) => [
        ...(old || []),
        { ...newComment, id: `temp-${Date.now()}`, authorName: null },
      ]);

      return { previousComments, taskId: newComment.taskId };
    },
    onError: (err, newComment, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", context.taskId],
          context.previousComments,
        );
      }
      toast.error("Failed to add comment");
    },
    onSuccess: (data, newComment) => {
      // Replace temp with real
      queryClient.setQueryData(
        ["comments", newComment.taskId],
        (old) => old?.map((c) => (c.id.startsWith("temp-") ? data : c)) || [],
      );
    },
    onSettled: (data, error, newComment) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({
        queryKey: ["comments", newComment.taskId],
      });
    },
  });
}
```

Apply same pattern to `useUpdateComment`, `useDeleteComment`, `useTasks`, `useProjects`, `useUsers`, etc.

## Activity Logging Convention

All mutating API routes must log to `activity_logs` after a successful entity write. Use `logActivity` from `src/lib/activity.ts` so the insert runs via Next.js `after()` (after the response is sent — does not block the client):

```ts
import { logActivity } from "@/lib/activity";

logActivity({
  userId: user.id,
  action:
    "created_task" |
    "updated_task" |
    "deleted_task" |
    "created_comment" |
    "updated_comment" |
    "deleted_comment",
  entityType: "task" | "comment" | "project" | "user",
  entityId: entity.id,
  details: `Created task: ${entity.title}`,
});
```

Do not `await db.insert(activityLogs)` in request handlers. Seed/bootstrap scripts may still insert directly.

Actions: `created_*`, `updated_*`, `deleted_*`, `changed_*_status`
