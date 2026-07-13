# AI Agent Instructions for Vellum

This document provides guidance for AI agents working on the Vellum project.

## Project Overview

**Vellum** (Vellum) is a Next.js 15 (App Router) team management platform with:

- PostgreSQL database using Drizzle ORM
- Kanban boards for project management
- Role-based authentication (superadmin, admin, member)
- Team and project organization
- Task tracking with priorities, statuses, comments
- Activity logging

## Tech Stack

- **Framework**: Next.js 16.2.6 (App Router, React 19, Turbopack)
- **Database**: PostgreSQL (Neon) with Drizzle ORM 0.45.2
- **Auth**: Custom session-based auth with bcryptjs
- **Styling**: Tailwind CSS 4.1.17
- **Language**: TypeScript 5.9.3
- **Package Manager**: bun (with bun.lock)

## Key Commands

```bash
# Development
bun run dev              # Start dev server (Turbopack)

# Database
bun run db:generate      # Generate migrations from schema.ts
bun run db:migrate       # Apply migrations to database
bun run db:push          # Push schema directly (no migration files)
bun run db:studio        # Open Drizzle Studio
bun run db:seed          # Seed database with demo data

# Code Quality
bun run lint             # ESLint
bun run typecheck        # TypeScript check

# Build & Deploy
bun run build            # Production build
bun run start            # Start production server
bun run vercel:build     # Build with migration generation
bun run vercel:deploy    # Migrate + deploy to Vercel
```

## Environment Variables

Required in `.env`:

- `DATABASE_URL` - Pooled connection (for app runtime)
- `DIRECT_DATABASE_URL` - Direct connection (for migrations)

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
6. **Write tests/verify** — Run `bun run lint`, `bun run typecheck`, `bun run build`
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
2. Run `bun run db:generate` to create migration
3. Run `bun run db:migrate` to apply
4. Commit both schema and migration files

### Seeding Data

- `seed.ts` - Full demo data (run manually with `bun run db:seed`)
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
- Run `bun run lint`, `bun run typecheck`, and `bun run build` before pushing.
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

- Tables: `users`, `teams`, `team_members`, `projects`, `project_milestones`, `project_notes`, `tasks`, `comments`, `sessions`, `user_sessions`, `activity_logs`, `push_subscriptions`, `notification_preferences`
- Enums: `user_role`, `user_status`, `task_status`, `task_priority`, `notification_event_type`
- Relations defined via Drizzle references

**User Status Field** (`users.status`):
- `active` — Normal access
- `inactive` — Cannot log in (user-initiated pause)
- `banned` — Cannot log in, existing sessions destroyed (admin-enforced)

## API Routes Reference

| Route                           | Methods            | Description          |
| ------------------------------- | ------------------ | -------------------- |
| `/api/auth/login`               | POST               | User login           |
| `/api/auth/logout`              | POST               | User logout          |
| `/api/auth/me`                  | GET                | Current user session |
| `/api/users`                    | GET, POST          | List/create users    |
| `/api/users/[id]`               | GET, PATCH, DELETE | User CRUD            |
| `/api/teams`                    | GET, POST          | List/create teams    |
| `/api/teams/[id]`               | GET, PATCH, DELETE | Team CRUD            |
| `/api/teams/[id]/members`       | GET, POST          | Team members         |
| `/api/projects`                 | GET, POST          | List/create projects |
| `/api/projects/[id]`            | GET, PATCH, DELETE | Project CRUD         |
| `/api/projects/[id]/milestones` | GET, POST          | Project milestones   |
| `/api/tasks`                    | GET, POST          | List/create tasks    |
| `/api/tasks/[id]`               | GET, PATCH, DELETE | Task CRUD            |
| `/api/comments`                 | GET, POST          | Task comments        |
| `/api/comments/[id]`            | PATCH, DELETE      | Comment CRUD         |
| `/api/activity`                 | GET                | Activity logs        |
| `/api/stats`                    | GET                | Dashboard statistics |
| `/api/push/subscribe`           | POST, DELETE       | Push subscription    |
| `/api/push/preferences`         | GET, PATCH         | Notification prefs   |
| `/api/health`                   | GET                | Health check         |
| `/api/super-admin/users`        | GET                | List users (last login/IP) |
| `/api/super-admin/users/[id]`   | PATCH              | Update user role/status |
| `/api/super-admin/activity`     | GET                | Activity feed + 24h stats |
| `/api/super-admin/sessions`     | GET                | Active sessions      |
| `/api/super-admin/sessions/[id]`| DELETE             | Revoke session       |
| `/api/super-admin/audit`        | GET                | Filtered audit logs (paginated) |
| `/api/super-admin/audit/export` | GET                | CSV export of audit logs |

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

All mutating API routes must log to `activity_logs` table after successful operation:

```ts
import { getClientIP } from "@/lib/audit";

await db.insert(activityLogs).values({
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
  ipAddress: getClientIP(req), // Optional but recommended
});
```

Actions: `created_*`, `updated_*`, `deleted_*`, `changed_*_status`
