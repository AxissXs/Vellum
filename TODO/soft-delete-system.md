# Soft Delete System

> **Priority:** High
> **Status:** Pending
> **Estimated complexity:** Large
> **Depends on:** Nothing
> **Blocks:** Audit Log — Enhanced Logs & Detail Modals

---

## Overview

Replace all permanent database `DELETE` operations with soft deletes that preserve records for audit trails and allow superadmin recovery. Regular users and admins "delete" entities by setting a `deletedAt` timestamp and `deletedBy` user ID. The data remains in the database but is excluded from normal queries. Superadmins can browse the "trash" and restore any soft-deleted entity.

This is a foundational prerequisite for the audit log improvements: if a task is deleted, the audit log must still be able to show the task title, link to it, and display its state at the time of deletion. Without soft delete, those references become dangling or broken.

## Current State

### Database (no soft delete support)
No table has `deletedAt` or `deletedBy` columns. All `DELETE` operations are permanent.

### Permanent DELETE operations found

| File | Line | Route | Entity |
|------|------|-------|--------|
| `src/app/api/tasks/[id]/route.ts` | 126 | DELETE /api/tasks/[id] | tasks |
| `src/app/api/projects/[id]/route.ts` | 108 | DELETE /api/projects/[id] | projects |
| `src/app/api/comments/[id]/route.ts` | 99 | DELETE /api/comments/[id] | comments |
| `src/app/api/teams/[id]/route.ts` | — | DELETE /api/teams/[id] | teams |
| `src/app/api/teams/[id]/members/route.ts` | — | DELETE /api/teams/[id]/members | teamMembers |
| `src/app/api/projects/[id]/milestones/[milestoneId]/route.ts` | — | DELETE milestone | projectMilestones |
| `src/app/api/project-notes/[id]/route.ts` | — | DELETE note | projectNotes |

> Some of the above files may use `db.delete(...)` without `returning()`. Search the codebase to ensure no `DELETE` is missed.

### Queries that must exclude soft-deleted rows

Any `db.select().from(tasks)` (or other entity table) currently returns **all** rows including soft-deleted ones once the column exists. Every read query must be updated.

#### Files that SELECT from each table (search for `from(tasks)`, `from(projects)`, etc.):
- `src/app/api/tasks/route.ts` — list tasks
- `src/app/api/tasks/[id]/route.ts` — get single task
- `src/app/api/projects/route.ts` — list projects
- `src/app/api/projects/[id]/route.ts` — get single project
- `src/app/api/projects/[id]/page.tsx` (server component) — project detail + tasks
- `src/app/dashboard/kanban/page.tsx` (server component) — global kanban
- `src/app/dashboard/kanban/KanbanBoardClient.tsx` — client queries (via hooks)
- `src/hooks/useTasks.ts` — React Query hooks for tasks
- `src/app/api/comments/route.ts` — list comments
- `src/app/api/comments/[id]/route.ts` — get single comment
- `src/app/api/teams/route.ts` — list teams
- `src/app/api/teams/[id]/route.ts` — get team
- `src/app/api/teams/[id]/members/route.ts` — list members
- `src/app/api/projects/[id]/milestones/route.ts` — list milestones
- `src/app/api/milestones/[id]/route.ts` — get milestone
- `src/app/api/project-notes/route.ts` — list notes
- `src/app/api/project-notes/[id]/route.ts` — get note
- `src/app/api/super-admin/health/route.ts` — counts tasks, projects, teams

> **Note:** Use `grep -r "from(tasks)\|from(projects)\|from(comments)\|from(teams)\|from(teamMembers)\|from(projectMilestones)\|from(projectNotes)" src/` to confirm the full list.

#### Queries that must EXCLUDE soft-deleted rows:
- `/api/tasks` — normal task list
- `/api/projects` — normal project list
- `/api/comments` — normal comment list
- `/api/teams` — normal team list
- `/api/teams/[id]/members` — team members
- `/api/projects/[id]/milestones` — milestones
- Kanban boards (global + project)
- Dashboard stats / health counts

#### Queries that MUST INCLUDE soft-deleted rows (for superadmin):
- `/api/super-admin/trash` — list all soft-deleted items
- `/api/super-admin/audit` — audit logs should be able to join to soft-deleted entities
- `/api/super-admin/audit/[id]` — audit log detail modal

---

## Database Changes

### Modified tables: add `deletedAt` + `deletedBy`

Apply to **all** of the following tables:

```ts
// tasks
export const tasks = pgTable("tasks", {
  // ... existing columns ...
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
});

// projects
export const projects = pgTable("projects", {
  // ... existing columns ...
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
});

// comments
export const comments = pgTable("comments", {
  // ... existing columns ...
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
});

// teams
export const teams = pgTable("teams", {
  // ... existing columns ...
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
});

// projectMilestones
export const projectMilestones = pgTable("project_milestones", {
  // ... existing columns ...
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
});

// projectNotes
export const projectNotes = pgTable("project_notes", {
  // ... existing columns ...
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
});

// teamMembers
export const teamMembers = pgTable("team_members", {
  // ... existing columns ...
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
});
```

**Rationale:**
- `deletedAt` is nullable. `NULL` = not deleted. `NOT NULL` = soft-deleted. This is the standard pattern.
- `deletedBy` stores who performed the deletion. `NULL` = unknown (e.g. system cleanup, legacy data).
- Foreign key `onDelete: "set null"` prevents accidental permanent cascade deletion when a user is hard-deleted.

### Do NOT add to these tables:
- `users` — user deletions are handled by `status: "banned"` / `"inactive"`. Hard delete of users is rare and should be a separate admin action.
- `sessions`, `user_sessions` — these are ephemeral by design.
- `activity_logs` — audit trail should never be deleted.
- `push_subscriptions`, `notification_preferences` — tied to user lifecycle, not business entities.
- `roles`, `permissionPresets` — system tables, deletable by admin but can be hard-deleted.

### No new tables needed
The existing tables acquire the two columns. A unified trash view can be built in the API by querying each table separately.

---

## API Routes

### Soft Delete Operations (replace `db.delete()`)

In every DELETE route, replace:
```ts
await db.delete(table).where(eq(table.id, id));
```
With:
```ts
await db
  .update(table)
  .set({ deletedAt: new Date(), deletedBy: user.id })
  .where(eq(table.id, id));
```

Then log the activity:
```ts
await db.insert(activityLogs).values({
  userId: user.id,
  action: "deleted_task",   // or deleted_project, deleted_comment, etc.
  entityType: "task",
  entityId: id,
  details: `Soft-deleted task: ${task.title}`,
  ipAddress: getClientIP(req),
});
```

### Restore API (superadmin only)

**`PATCH /api/super-admin/restore`**
Body:
```json
{
  "entities": [
    { "type": "task", "id": "uuid" },
    { "type": "project", "id": "uuid" }
  ]
}
```

Constraints:
- Only `superadmin` can restore.
- Validation: each `type` must be one of the supported entity types.
- For each entity, set `deletedAt = NULL, deletedBy = NULL`.
- Log restoration to `activity_logs` with action `"restored_task"`, etc.
- Return `{ restored: number }`.

**`GET /api/super-admin/trash`**
Query params:
- `type` — filter by entity type (`task`, `project`, `comment`, `team`, `milestone`, `note`, `teamMember`)
- `search` — text search on title/name
- `from`, `to` — date range on `deletedAt`
- `deletedBy` — user ID filter
- `page`, `pageSize` — pagination

Response:
```json
{
  "items": [
    {
      "type": "task",
      "id": "uuid",
      "title": "Fix login bug",
      "deletedAt": "...",
      "deletedBy": { "id": "uuid", "name": "Alice", "email": "..." },
      "projectName": "Project Alpha"   // entity-specific fields
    }
  ],
  "page": 1,
  "pageSize": 25,
  "total": 150
}
```

Implementation: query each soft-deletable table with `WHERE deleted_at IS NOT NULL`, union the results in memory, then apply filters and pagination. For performance with large datasets, consider a Postgres view or a dedicated `deleted_entities` table (future optimization — not required for MVP).

---

## Query Updates

### Normal queries (exclude soft-deleted)

For Drizzle, add `.where(isNull(table.deletedAt))` to every read query:

```ts
// Before
await db.select().from(tasks).where(eq(tasks.projectId, projectId));

// After
await db.select().from(tasks)
  .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)));
```

### Helper (optional but recommended)

Create a reusable helper in `src/db/utils.ts`:

```ts
import { SQL, sql } from "drizzle-orm";

export function notDeleted<T extends { deletedAt: unknown }>(table: T): SQL {
  return sql`${table.deletedAt} IS NULL`;
}
```

Then use:
```ts
import { notDeleted } from "@/db/utils";
await db.select().from(tasks).where(and(eq(tasks.projectId, id), notDeleted(tasks)));
```

Alternatively, create Drizzle views for each table that auto-filter soft-deleted rows:
```ts
// src/db/views.ts
export const activeTasks = pgView("active_tasks").as(
  db.select().from(tasks).where(isNull(tasks.deletedAt))
);
```
> Views are more work to maintain and may complicate joins. The explicit `isNull` filter is safer and clearer.

---

## UI Changes

### SuperAdmin Trash Panel

New component: `src/app/dashboard/super-admin/SuperAdminTrashPanel.tsx`

Features:
- Table listing all soft-deleted items with columns: Type, Title/Name, Deleted By, Deleted At, Project/Team (context)
- Filters: entity type dropdown, date range, deleted-by user, search
- Bulk selection with checkbox + "Restore Selected" button
- Individual "Restore" row action
- Confirmation modal: "Restore 3 tasks and 1 project?"
- Toast: `toast.success("Restored 4 items")` / `toast.error("Restore failed")`
- Empty state: "Trash is empty" illustration

Tab integration:
- Add `"trash"` tab to `SuperAdminClient.tsx` alongside "audit", "users", etc.

### Normal UI (no changes needed)

For regular users, soft-deleted items simply disappear from all lists. No "trash" UI is needed outside the superadmin panel.

### Delete button behavior

No change to the button itself. The DELETE route still returns `{ success: true }`. The item disappears from the UI via React Query invalidation (already working).

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/super-admin/restore/route.ts` | PATCH bulk restore (superadmin only) |
| `src/app/api/super-admin/trash/route.ts` | GET paginated, filterable trash list |
| `src/app/dashboard/super-admin/SuperAdminTrashPanel.tsx` | Trash UI with filters + restore |

## Files to Modify

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `deletedAt` + `deletedBy` to tasks, projects, comments, teams, projectMilestones, projectNotes, teamMembers |
| All `*.sql` migrations | Run `bun run db:generate` to create migration |
| `src/app/api/tasks/[id]/route.ts` | DELETE: soft delete instead of `db.delete()`, log activity |
| `src/app/api/projects/[id]/route.ts` | DELETE: soft delete instead of `db.delete()`, log activity |
| `src/app/api/comments/[id]/route.ts` | DELETE: soft delete instead of `db.delete()`, log activity |
| `src/app/api/teams/[id]/route.ts` | DELETE: soft delete (add `deletedAt`, `deletedBy`) |
| `src/app/api/teams/[id]/members/route.ts` | DELETE member: soft delete |
| `src/app/api/projects/[id]/milestones/[milestoneId]/route.ts` | DELETE milestone: soft delete |
| `src/app/api/project-notes/[id]/route.ts` | DELETE note: soft delete |
| All read queries in API routes | Add `isNull(table.deletedAt)` filter |
| All server components | Add `isNull(table.deletedAt)` filter to DB queries |
| `src/hooks/useTasks.ts`, `useProjects.ts`, etc. | No direct DB queries, but ensure invalidation after soft delete works correctly |
| `src/app/dashboard/super-admin/SuperAdminClient.tsx` | Add `"trash"` tab |
| `src/app/api/super-admin/health/route.ts` | Update counts to exclude soft-deleted items |

---

## Migration Strategy

1. **Add columns to schema** (`src/db/schema.ts`)
2. **Generate & run migration** (`bun run db:generate`, `bun run db:migrate`)
3. **Update DELETE routes** — one by one, replace `db.delete` with soft-delete update
4. **Update all read queries** — add `isNull(deletedAt)` to every SELECT. Do this table-by-table to avoid missing any:
   - `tasks`
   - `projects`
   - `comments`
   - `teams`
   - `projectMilestones`
   - `projectNotes`
   - `teamMembers`
5. **Build restore API** (`/api/super-admin/restore`)
6. **Build trash API** (`/api/super-admin/trash`)
7. **Build Trash UI panel**
8. **Run `bun run lint`, `bun run typecheck`, `bun run build`**

---

## Activity Logging

Every soft delete should log:
- `action`: `"deleted_task"`, `"deleted_project"`, `"deleted_comment"`, `"deleted_team"`, `"deleted_milestone"`, `"deleted_note"`, `"deleted_team_member"`
- `entityType`: matching entity
- `entityId`: the soft-deleted entity ID
- `details`: human-readable description
- `ipAddress`: from `getClientIP(req)`

Every restore should log:
- `action`: `"restored_task"`, etc.
- `entityType`: matching entity
- `entityId`: restored entity ID
- `details`: `"Restored task: {title}"`
- `ipAddress`: from `getClientIP(req)`

---

## Acceptance Criteria

- [ ] All listed tables have `deletedAt` and `deletedBy` columns
- [ ] No API route permanently deletes any of these entities (all use soft delete)
- [ ] All normal read queries exclude soft-deleted rows
- [ ] Superadmin can view all soft-deleted items in the Trash panel
- [ ] Superadmin can restore individual or bulk soft-deleted items
- [ ] Restored items reappear in normal views immediately
- [ ] Audit log still references soft-deleted entities without errors
- [ ] Health/stats counts exclude soft-deleted items
- [ ] Foreign key constraints remain intact (no cascade hard-deletes)
- [ ] `bun run lint`, `bun run typecheck`, `bun run build` all pass

---

## Execution Order

1. Schema changes + migration
2. Update all read queries (table by table)
3. Convert all DELETE routes to soft delete (table by table)
4. Build restore API
5. Build trash API
6. Build Trash UI panel
7. Add trash tab to superadmin dashboard
8. Update health stats to exclude soft-deleted
9. Verify no `db.delete()` calls remain on soft-deletable tables (except superadmin hard-delete if any)
10. Lint, typecheck, build
