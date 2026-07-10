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

1. **Read relevant files** - Understand existing patterns before modifying
2. **Follow conventions** - Match existing code style, naming, patterns
3. **Write tests/verify** - Run `bun run lint`, `bun run typecheck`, `bun run build`
4. **Commit changes** - Use conventional commit format

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

### After Completing a Task

1. Run quality checks: `bun run lint && bun run typecheck && bun run build`
2. **Update documentation** - Update `TODO.md`, `STRUCTURE.md`, `AGENTS.md` if applicable
3. Stage changes: `git add -A`
4. Commit with conventional message
5. Push: `git push`

## File Structure Reference

See `STRUCTURE.md` for detailed file/folder structure with exports and purposes.

## Database Schema Reference

See `src/db/schema.ts` for:

- Tables: `users`, `teams`, `team_members`, `projects`, `project_milestones`, `project_notes`, `tasks`, `comments`, `sessions`, `activity_logs`
- Enums: `user_role`, `task_status`, `task_priority`
- Relations defined via Drizzle references

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
| `/api/activity`                 | GET                | Activity logs        |
| `/api/stats`                    | GET                | Dashboard statistics |
| `/api/health`                   | GET                | Health check         |
