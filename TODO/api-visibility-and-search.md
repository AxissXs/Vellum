# API Visibility Fixes + Search Endpoints

> **Priority:** High
> **Status:** Pending
> **Estimated complexity:** Large
> **Depends on:** `src/lib/project-visibility.ts` (exists)
> **Blocks:** Nothing

---

## Overview

Fix 7 visibility/security gaps in existing API routes and add search endpoints for tasks and projects. All new and fixed routes enforce project-level visibility consistently.

## Security Gaps to Fix

### Gap 1: `GET/PATCH/DELETE /api/projects/[id]` — team projects accessible by anyone

**Current:** Only checks `private` visibility. A `team`-scoped project can be read/modified/deleted by any authenticated user via direct ID lookup.

**Fix:** Apply full `buildProjectVisibilityCondition` check on single-project lookups.

### Gap 2: `GET/POST /api/projects/[id]/milestones` — no parent project visibility check

**Current:** No visibility check at all. Any user can read/create milestones on any project.

**Fix:** Check parent project visibility before allowing access.

### Gap 3: `GET /api/agent/projects` — returns ALL projects

**Current:** No visibility filtering. Returns private and team-scoped projects to any agent.

**Fix:** Apply `buildProjectVisibilityCondition`.

### Gap 4: `GET /api/agent/tasks` — returns ALL tasks

**Current:** No project visibility filtering. Returns tasks from private/team projects.

**Fix:** Join projects table, apply visibility condition.

### Gap 5: `POST /api/agent/tasks/[id]/comment` — can comment on deleted tasks

**Current:** Does not check `isNull(tasks.deletedAt)`.

**Fix:** Add soft-delete check.

### Gap 6: Task routes have no visibility filtering

**Current:** `GET/PATCH/DELETE /api/tasks` and `/api/tasks/[id]` don't check project visibility. Any user can access any task.

**Fix:** Join projects table, apply visibility condition on reads and mutations.

### Gap 7: `PATCH/DELETE /api/projects/[id]` — no ownership check for mutations

**Current:** Any user who can see a project can also modify/delete it (unless private).

**Fix:** For `team` visibility, only allow owner + team members with appropriate role. For now, keep it simple: owner can always mutate, team members can mutate if they're on the team. (Full RBAC comes with role-permission-manager.)

---

## New Visibility Helper

Create `src/lib/project-access.ts` with reusable helpers:

```ts
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectTeams, teamMembers } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

type Project = typeof projects.$inferSelect;

/**
 * Check if a user can access a project based on visibility rules.
 * - "company": visible to all authenticated users
 * - "team": visible to project owner + members of linked teams
 * - "private": visible only to project owner
 */
export async function canAccessProject(
  userId: string,
  project: Project
): Promise<boolean> {
  if (project.visibility === "company") return true;
  if (project.ownerId === userId) return true;

  if (project.visibility === "team") {
    // Check if user is on any of the project's teams
    const projectTeamRows = await db
      .select({ teamId: projectTeams.teamId })
      .from(projectTeams)
      .where(eq(projectTeams.projectId, project.id));

    if (projectTeamRows.length === 0) return false;

    const teamIds = projectTeamRows.map((r) => r.teamId);
    const membership = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          inArray(teamMembers.teamId, teamIds),
          isNull(teamMembers.deletedAt)
        )
      )
      .limit(1);

    return membership.length > 0;
  }

  return false; // private + not owner
}

/**
 * Fetch a project by ID and check access. Returns null if not found or access denied.
 */
export async function getAccessibleProject(
  userId: string,
  projectId: string
): Promise<Project | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) return null;

  const access = await canAccessProject(userId, project);
  return access ? project : null;
}

/**
 * Get all project IDs the user can access (for filtering task lists etc).
 */
export async function getAccessibleProjectIds(userId: string): Promise<string[]> {
  const allProjects = await db
    .select({ id: projects.id, visibility: projects.visibility, ownerId: projects.ownerId })
    .from(projects)
    .where(isNull(projects.deletedAt));

  const accessible: string[] = [];

  for (const p of allProjects) {
    if (await canAccessProject(userId, p)) {
      accessible.push(p.id);
    }
  }

  return accessible;
}
```

**Performance note:** `getAccessibleProjectIds` is N+1. For the list endpoints (`GET /api/tasks`, `GET /api/agent/tasks`) that already use `getTeamVisibleProjectIds`, we can reuse the existing visibility condition SQL instead. The helper above is for single-project lookups and mutations.

For list endpoints, extend `buildProjectVisibilityCondition` from `src/lib/project-visibility.ts` to also handle the team membership check inline (SQL-level, no N+1).

---

## Route Changes

### Fix `GET/PATCH/DELETE /api/projects/[id]`

Replace the manual `private`-only check with `getAccessibleProject()`:

```ts
const project = await getAccessibleProject(user.id, id);
if (!project) {
  return NextResponse.json({ error: "Project not found" }, { status: 404 });
}
```

Also migrate to `withAuth` HOF wrapper.

### Fix `GET/POST /api/projects/[id]/milestones`

Before querying milestones, verify parent project access:

```ts
const project = await getAccessibleProject(user.id, projectId);
if (!project) {
  return NextResponse.json({ error: "Project not found" }, { status: 404 });
}
```

### Fix `GET /api/agent/projects`

Apply `buildProjectVisibilityCondition`:

```ts
import { getTeamVisibleProjectIds, buildProjectVisibilityCondition } from "@/lib/project-visibility";

const teamVisibleIds = await getTeamVisibleProjectIds(user.id);
const rows = await db.select().from(projects)
  .where(and(isNull(projects.deletedAt), eq(projects.archived, false), buildProjectVisibilityCondition(user.id, teamVisibleIds)));
```

### Fix `GET /api/agent/tasks`

Join projects and apply visibility:

```ts
import { getTeamVisibleProjectIds, buildProjectVisibilityCondition } from "@/lib/project-visibility";

const teamVisibleIds = await getTeamVisibleProjectIds(user.id);
const rows = await db.select({ task: tasks, projectName: projects.name })
  .from(tasks)
  .innerJoin(projects, eq(tasks.projectId, projects.id))
  .where(and(
    isNull(tasks.deletedAt),
    buildProjectVisibilityCondition(user.id, teamVisibleIds)
  ));
```

### Fix `POST /api/agent/tasks/[id]/comment`

Add soft-delete check:

```ts
const [task] = await db.select().from(tasks)
  .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
  .limit(1);

if (!task) {
  return NextResponse.json({ error: "Task not found" }, { status: 404 });
}
```

### Fix `GET/PATCH/DELETE /api/tasks` and `/api/tasks/[id]`

Join projects table and apply visibility condition. For `GET /api/tasks`:

```ts
const teamVisibleIds = await getTeamVisibleProjectIds(user.id);
const rows = await db.select({ task: tasks, assigneeName: users.name, ... })
  .from(tasks)
  .leftJoin(users, eq(tasks.assigneeId, users.id))
  .innerJoin(projects, eq(tasks.projectId, projects.id))
  .where(and(
    isNull(tasks.deletedAt),
    buildProjectVisibilityCondition(user.id, teamVisibleIds),
    ...filters
  ));
```

For `PATCH/DELETE /api/tasks/[id]`, check that the user can access the parent project before allowing the mutation.

---

## New Search Endpoints

### `GET /api/tasks/search?q=<query>`

**Query params:**
- `q` (required, min 2 chars) — search term
- `projectId` (optional) — scope to project
- `status` (optional) — filter by status
- `limit` (optional, default 20, max 50)

**Behavior:**
- `ILIKE` match on `tasks.title` and `tasks.description`
- Apply project visibility filtering
- Return matching tasks with assignee info, ranked by relevance (title match > description match)

### `GET /api/projects/search?q=<query>`

**Query params:**
- `q` (required, min 2 chars) — search term
- `limit` (optional, default 20, max 50)

**Behavior:**
- `ILIKE` match on `projects.name` and `projects.description`
- Apply `buildProjectVisibilityCondition`
- Return matching projects

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/project-access.ts` | `canAccessProject()`, `getAccessibleProject()`, `getAccessibleProjectIds()` |
| `src/app/api/tasks/search/route.ts` | `GET /api/tasks/search` |
| `src/app/api/projects/search/route.ts` | `GET /api/projects/search` |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/api/projects/[id]/route.ts` | Fix visibility check on GET/PATCH/DELETE, migrate to `withAuth` |
| `src/app/api/projects/[id]/milestones/route.ts` | Add parent project visibility check |
| `src/app/api/agent/projects/route.ts` | Add visibility filtering |
| `src/app/api/agent/tasks/route.ts` | Add project visibility filtering via join |
| `src/app/api/agent/tasks/[id]/comment/route.ts` | Add soft-delete check |
| `src/app/api/tasks/route.ts` | Add project visibility filtering via join |
| `src/app/api/tasks/[id]/route.ts` | Add project visibility check on PATCH/DELETE |
| `AGENTS.md` | Document visibility rules |
| `DONE.md` | Add entry |
| `TODO.md` | Mark task done |

## Acceptance Criteria

- [ ] `getAccessibleProject()` enforces company/team/private visibility
- [ ] `GET/PATCH/DELETE /api/projects/[id]` rejects access to team projects user isn't on
- [ ] `GET/POST /api/projects/[id]/milestones` checks parent project visibility
- [ ] `GET /api/agent/projects` filters by visibility
- [ ] `GET /api/agent/tasks` filters by project visibility
- [ ] `POST /api/agent/tasks/[id]/comment` rejects deleted tasks
- [ ] `GET/PATCH/DELETE /api/tasks` and `/api/tasks/[id]` filter by project visibility
- [ ] `GET /api/tasks/search?q=...` returns visibility-filtered results
- [ ] `GET /api/projects/search?q=...` returns visibility-filtered results
- [ ] All routes use `withAuth` or `withRole` HOF wrappers
- [ ] `bun run lint`, `bun run typecheck`, `bun run build` all pass
