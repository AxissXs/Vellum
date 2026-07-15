# AI Agent Instructions for Vellum

High-signal notes you are likely to miss. For routine facts (file lists, schema, API tables) read `STRUCTURE.md`, `TODO.md`, and `README.md` instead of asking.

## Quick Context

- Next.js 16 (App Router, React 19, Turbopack) + TypeScript 5.9 + Tailwind CSS 4.1
- PostgreSQL (Neon) with Drizzle ORM 0.45.2
- **Package manager: `bun`** (lockfile `bun.lock`)
- **Default branch: `master`** (not `main`)
- **No test framework is configured yet** — do not run tests
- **No CI / pre-commit hooks** — `lint` → `typecheck` → `build` are the only gates before push

## Before Any Work

1. `git checkout master && git pull origin master`
2. Read `TODO.md` for available tasks
3. Create a feature branch from `master`
4. **Work on the feature branch, never on `master`**
5. When the task is done, merge the feature branch into the **`dev` branch**, not `master`
6. Before merging into `dev`, make sure `dev` is up to date with `master` (`git checkout dev && git pull origin dev && git merge master`)

**Rules:**
- **Never push directly to `master`** — all work goes through feature branches merged into `dev`
- **Never merge feature branches into `master`** — merge only into `dev`
- Branch prefixes: `feat/`, `fix/`, `chore/`, `refactor/`, `hotfix/`

## Before Committing

Run in this order (they catch different issues):

```bash
bun run lint       # flat ESLint config at eslint.config.mjs (no .eslintrc)
bun run typecheck  # tsc --noEmit, strict enabled
bun run build      # production build / Turbopack smoke test
```

Commit with conventional commits: `type(scope): description`
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `db`

## Database

### Env

Required in `.env` (copy from `.env.example`):

- `DATABASE_URL` — **pooled** connection (Neon: `-pooler` suffix) → used by app runtime
- `DIRECT_DATABASE_URL` — **direct** connection (Neon: no `-pooler`) → used by Drizzle Kit / migrations

### Commands

```bash
bun run db:generate   # Generate migrations from src/db/schema.ts
bun run db:migrate    # Apply migrations
bun run db:push       # Push schema directly (no migration files)
bun run db:studio     # Drizzle Studio
bun run db:seed       # Full demo data (manual, one-off)
```

All `db:*` scripts load `.env` via `dotenv-cli`.

### Changing Schema

1. Edit `src/db/schema.ts`
2. `bun run db:generate` → writes to `drizzle/`
3. `bun run db:migrate`
4. **Commit both `src/db/schema.ts` and `drizzle/*`**

### Setup & Seeding Quirks

- **First-time setup** is via `/setup` page in the browser, not CLI seed. It creates the initial superadmin + first team, and only works when the `users` table is empty.
- `bootstrap.ts` auto-seeds minimal demo data on the **first API call** (`ensureDemoData()`). Do not rely on this for full testing data.
- `seed.ts` is the full demo dataset (8 users, 4 teams, 30+ tasks). Run manually with `bun run db:seed`.

## Auth

Custom session auth in `src/lib/auth.ts`:

- Cookie name: `tf_session`, max-age 7 days
- Get current user: `await getSession()` (server components and API routes)
- Role gate: `requireRole(user, ['superadmin' | 'admin' | 'member'])`
- **Banned users are evicted immediately** by `getSession()` (session destroyed, treated as logged out)
- `inactive` users are blocked at login with a specific error

## Architecture Quirks

- **Server Components are default.** Add `"use client"` only for interactivity.
- Path alias: `@/*` → `./src/*`
- **DB singleton uses `globalThis.__arenaNextJsPostgresqlPool`** in `src/db/index.ts` to avoid creating multiple pools in dev. Do not rename this global or switch to a plain `new Pool()` without preserving the pattern.
- **Next.js config is `next.config.ts`** and is intentionally empty/minimal.
- **Tailwind v4** uses `@tailwindcss/postcss` in `postcss.config.mjs`. Do not create a `tailwind.config.js`.
- Real-time via **Pusher** (not raw WebSockets). Server code in `src/lib/pusher*.ts`, client singleton in `src/lib/pusher-client.ts`, hook in `src/hooks/useRealtime.ts`.
- Push notifications via Web Push (VAPID). Service worker at `public/sw.js`. Server utilities in `src/lib/push.ts`.

## Required Conventions

### Activity Logging

All mutating API routes must write to `activity_logs` after the operation succeeds:

```ts
import { getClientIP } from "@/lib/audit";

await db.insert(activityLogs).values({
  userId: user.id,
  action: "created_task" | "updated_task" | "deleted_task" | ...,  // prefix: created_, updated_, deleted_, changed__status
  entityType: "task" | "comment" | "project" | "user",
  entityId: entity.id,
  details: `Created task: ${entity.title}`,
  ipAddress: getClientIP(req), // optional but preferred
});
```

### React Query Optimistic Updates

Every mutation must use the full optimistic-update pattern:

- `onMutate` — snapshot old data, apply optimistic change
- `onError` — rollback to snapshot, `toast.error("...")`
- `onSuccess` — replace temp IDs with real server data
- `onSettled` — invalidate queries to resync

Reference implementation: `src/hooks/useComments.ts`. Apply the same pattern to `useTasks.ts`, `useProjects.ts`, `useTeams.ts`, `useUsers.ts`, `useMilestones.ts`, etc.

### In-App Notifications

After mutating an entity (task assignment, status change, comment), also send an in-app notification if there is a relevant recipient:

```ts
import { sendInAppNotification } from "@/lib/notifications";

await sendInAppNotification({
  userId: assigneeId,
  type: "task_assigned", // or "status_changed", "new_comment", etc.
  title: "New Task Assigned",
  content: `${actorName} assigned you "${taskTitle}"`,
  entityType: "task",
  entityId: taskId,
  actorUserId: actorId,
});
```

- `sendInAppNotification()` checks `inAppEnabled` preferences automatically
- Broadcasts to Pusher channel `user-${userId}` for real-time badge updates
- Always place after the DB mutation succeeds and after `activityLogs` insert

## Documentation Update Rule

**Any file add / remove / rename must update:**

- `TODO.md` — mark tasks done, add new ones if discovered
- `STRUCTURE.md` — update file tree, exports, API route tables, data flow
- `AGENTS.md` — update conventions or workflow if behavior changes

## Deploy (Vercel)

```bash
bun run vercel:build    # db:generate + next build
bun run vercel:deploy   # db:migrate + vercel --prod
```

Migrations auto-run during build via `vercel:build`.
