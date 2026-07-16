# Audit Log — Enhanced Logs & Detail Modals

> **Priority:** High
> **Status:** Done
> **Estimated complexity:** Large
> **Depends on:** Soft Delete System
> **Blocked by:** Soft Delete System (must have soft-deleted entities linkable)

---

## Overview

Completely revamp the superadmin audit log tab to fix IP address unreliability, add structured metadata (tags, severity), preserve entity snapshots at the moment of each event, and turn every log entry into a rich, clickable detail modal. The detail modal shows full event context, a before/after diff for update events, and deep-links to related users, tasks, projects, and other entities.

The audit log is the primary security and compliance tool for superadmins. It must be accurate, complete, and navigable.

## Current State

### Existing Audit Log
- **Table:** `activity_logs` (`src/db/schema.ts:180-191`)
- **API:** `GET /api/super-admin/audit` (`src/app/api/super-admin/audit/route.ts`) — paginated, filterable by user, action, IP, date range
- **API:** `GET /api/super-admin/audit/export` (`src/app/api/super-admin/audit/export/route.ts`) — CSV export
- **UI:** `SuperAdminAuditPanel` (`src/app/dashboard/super-admin/SuperAdminAuditPanel.tsx`) — table view with filters, pagination, CSV export button
- **IP capture:** `getClientIP()` in `src/lib/audit.ts` — naive header read; returns first header found, no parsing, no validation

### Current `activity_logs` schema
```ts
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Current `getClientIP()`
```ts
export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
```
**Problems:**
1. `x-forwarded-for` can be a comma-separated list: `203.0.113.1, 198.51.100.1, 10.0.0.1`. The current code stores the entire string including internal proxies.
2. No handling of IPv6.
3. No handling of Cloudflare / AWS ALB / other proxy headers (`cf-connecting-ip`, `x-client-ip`).
4. No validation of IP format.
5. Called in DELETE routes but not in all CREATE/UPDATE routes — inconsistency.

---

## Database Changes

### Modified: `activity_logs` — add `tag`, `severity`

```ts
export const activityLogs = pgTable("activity_logs", {
  // ... existing columns ...
  tag: text("tag"),               // Structured tag: user_action, security, data_change
  severity: text("severity").default("info").notNull(),  // info | warning | critical
  // ...
});
```

**Severity mapping:**
| Action pattern | Severity |
|---------------|----------|
| `created_*`, `updated_*` (normal) | `info` |
| `deleted_*` (with soft delete) | `warning` |
| `changed_task_status` | `info` |
| Login failed, password reset, role change, permission change | `critical` |
| Bulk delete, mass update | `warning` |
| `restored_*` | `info` |

**Tag mapping:**
| Action pattern | Tag |
|---------------|-----|
| `created_*`, `updated_*`, `deleted_*`, `changed_*`, `restored_*` | `data_change` |
| `login_*`, `logout`, `session_*`, `failed_login` | `security` |
| `created_user`, `updated_user`, `deleted_user`, `change_user_status`, `created_role`, `updated_role`, `deleted_role` | `user_action` |

### New table: `activity_log_snapshots`

```ts
export const activityLogSnapshots = pgTable("activity_log_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  logId: uuid("log_id")
    .references(() => activityLogs.id, { onDelete: "cascade" })
    .notNull(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  snapshot: text("snapshot").notNull(),
  snapshotType: text("snapshot_type").notNull().default("after"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Rationale:**
- One `activity_log` row can have multiple snapshots:
  - **Create event:** 1 snapshot (`snapshotType: "after"`)
  - **Update event:** 2 snapshots (`snapshotType: "before"`, `"after"`)
  - **Delete event:** 1 snapshot (`snapshotType: "before"`)
- `snapshot` is stored as JSON text. Parse in application code.
- `recordId` is `text` to support any ID type.

---

## API Routes

### Updated: `GET /api/super-admin/audit`

New query params:
- `tag` — filter by tag
- `severity` — filter by severity
- Existing params remain: `userId`, `action`, `ip`, `from`, `to`, `page`, `pageSize`

Response shape (unchanged structure, new fields in rows):
```json
{
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "Alice",
      "userEmail": "alice@example.com",
      "action": "deleted_task",
      "entityType": "task",
      "entityId": "uuid",
      "details": "Soft-deleted task: Fix login bug",
      "ipAddress": "203.0.113.1",
      "tag": "data_change",
      "severity": "warning",
      "createdAt": "..."
    }
  ],
  "page": 1,
  "pageSize": 25,
  "total": 100,
  "totalPages": 4
}
```

### New: `GET /api/super-admin/audit/[id]`

Return a single audit log entry with full snapshot data and related entity info.

```json
{
  "log": {
    "id": "uuid",
    "userId": "uuid",
    "userName": "Alice",
    "userEmail": "alice@example.com",
    "userAvatar": "...",
    "action": "deleted_task",
    "entityType": "task",
    "entityId": "uuid",
    "details": "Soft-deleted task: Fix login bug",
    "ipAddress": "203.0.113.1",
    "tag": "data_change",
    "severity": "warning",
    "createdAt": "..."
  },
  "snapshots": [
    {
      "tableName": "tasks",
      "recordId": "uuid",
      "snapshotType": "before",
      "snapshot": { "id": "uuid", "title": "Fix login bug", "status": "in_progress" }
    }
  ],
  "actor": {
    "id": "uuid",
    "name": "Alice",
    "email": "alice@example.com",
    "role": "admin",
    "avatarUrl": "...",
    "lastLoginAt": "...",
    "lastIp": "..."
  },
  "entity": {
    "exists": true,
    "current": { "id": "uuid", "title": "Fix login bug (restored)" }
  }
}
```

- `actor` is enriched from `users` + `user_sessions` (last login).
- `entity.current` fetches the current state of the entity. If soft-deleted, still returns the row (thanks to soft delete system). If permanently gone, `exists: false`.

### Updated: `GET /api/super-admin/audit/export`

- Add `tag` and `severity` columns to CSV.
- JSON export option that includes snapshot data.

### Updated: All mutation routes to write snapshots

Every route that mutates data must write to both `activityLogs` and `activityLogSnapshots`.

**Example: task creation**
```ts
const [log] = await db.insert(activityLogs).values({
  userId: user.id,
  action: "created_task",
  entityType: "task",
  entityId: task.id,
  details: `Created task: ${task.title}`,
  ipAddress: getClientIP(req),
  tag: "data_change",
  severity: "info",
}).returning();

await db.insert(activityLogSnapshots).values({
  logId: log.id,
  tableName: "tasks",
  recordId: task.id,
  snapshot: JSON.stringify(task),
  snapshotType: "after",
});
```

**Example: task update**
```ts
const [before] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
const [after] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
const [log] = await db.insert(activityLogs).values({ ... }).returning();

await db.insert(activityLogSnapshots).values([
  { logId: log.id, tableName: "tasks", recordId: id, snapshot: JSON.stringify(before), snapshotType: "before" },
  { logId: log.id, tableName: "tasks", recordId: id, snapshot: JSON.stringify(after), snapshotType: "after" },
]);
```

**Example: task soft delete**
```ts
const [before] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
await db.update(tasks).set({ deletedAt: new Date(), deletedBy: user.id }).where(eq(tasks.id, id));

const [log] = await db.insert(activityLogs).values({
  action: "deleted_task",
  tag: "data_change",
  severity: "warning",
  ...,
}).returning();

await db.insert(activityLogSnapshots).values({
  logId: log.id,
  tableName: "tasks",
  recordId: id,
  snapshot: JSON.stringify(before),
  snapshotType: "before",
});
```

**Files that must write snapshots:**
- `src/app/api/tasks/route.ts` (POST create)
- `src/app/api/tasks/[id]/route.ts` (PATCH update, DELETE soft delete)
- `src/app/api/projects/route.ts` (POST create)
- `src/app/api/projects/[id]/route.ts` (PATCH update, DELETE soft delete)
- `src/app/api/comments/route.ts` (POST create)
- `src/app/api/comments/[id]/route.ts` (PATCH update, DELETE soft delete)
- `src/app/api/teams/route.ts` (POST create)
- `src/app/api/teams/[id]/route.ts` (PATCH update, DELETE soft delete)
- `src/app/api/teams/[id]/members/route.ts` (POST add, DELETE remove)
- `src/app/api/projects/[id]/milestones/route.ts` (POST create)
- `src/app/api/milestones/[id]/route.ts` (PATCH update, DELETE soft delete)
- `src/app/api/project-notes/route.ts` (POST create)
- `src/app/api/project-notes/[id]/route.ts` (PATCH update, DELETE soft delete)
- `src/app/api/super-admin/restore/route.ts` (PATCH restore)
- `src/app/api/users/route.ts` (POST create)
- `src/app/api/users/[id]/route.ts` (PATCH update, DELETE)
- `src/app/api/auth/login/route.ts` (login success/failure)
- `src/app/api/auth/logout/route.ts` (logout)

### Updated: `getClientIP()`

Replace `src/lib/audit.ts` with a robust implementation that:
- Parses comma-separated `x-forwarded-for` and takes first valid, non-private IP
- Skips `127.x.x.x`, `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`
- Checks multiple headers in priority order: x-forwarded-for, x-real-ip, x-client-ip, cf-connecting-ip, true-client-ip
- Validates IPv4 and basic IPv6 format
- Falls back to `"unknown"`

```ts
import { NextRequest } from "next/server";

function isValidIP(ip: string): boolean {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip.split(".").every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
  if (/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ip)) return true;
  return false;
}

function isPrivateIP(ip: string): boolean {
  if (!ip.includes(".")) return false;
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 127
  );
}

export function getClientIP(req: NextRequest): string {
  const headersToCheck = [
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "cf-connecting-ip",
    "true-client-ip",
  ];

  for (const header of headersToCheck) {
    const value = req.headers.get(header);
    if (!value) continue;

    const ips = value.split(",").map((s) => s.trim());
    for (const ip of ips) {
      if (isValidIP(ip) && !isPrivateIP(ip)) {
        return ip;
      }
    }
  }

  return "unknown";
}
```

---

## UI Changes

### Rewrite: `SuperAdminAuditPanel.tsx`

Current file: `src/app/dashboard/super-admin/SuperAdminAuditPanel.tsx` (252 lines)

**Maintain:**
- Filter bar (user ID, action, IP, date range)
- Pagination
- CSV export button
- Table layout

**Add:**

#### Tag + Severity Filters
- **Tag pills** above the table: `All`, `Data Change`, `Security`, `User Action`. Click to filter.
- **Severity pills**: `All`, `Info`, `Warning`, `Critical`. Click to filter.
- Active filter state is reflected in query params so the URL is shareable.

#### Severity Badges
In the table, show a small colored dot + label:
- `info` — blue dot, label "Info"
- `warning` — amber dot, label "Warning"
- `critical` — red dot, label "Critical"

#### Action Tag Badges
Show the `tag` value as a subtle badge next to the action name, e.g.:
- `deleted_task`  `data_change`
- `failed_login`  `security`

#### Clickable Rows (Modal Trigger)
Make every table row clickable. Clicking opens an **Audit Log Detail Modal** (Sheet component from shadcn/ui or a custom Dialog).

---

### New: Audit Log Detail Modal (`AuditLogDetailModal.tsx`)

Component: `src/app/dashboard/super-admin/AuditLogDetailModal.tsx`

Sections within the modal:

**1. Actor Section (header)**
- Avatar + name + email
- Role badge
- IP address (with globe icon, copy-to-clipboard button)
- Timestamp (full datetime)
- User agent string (collapsible, truncated by default)

**2. Event Summary Card**
- Action name (large, bold)
- Severity badge
- Tag badge
- Details text
- Entity type badge + entity ID (linkable)

**3. Entity Card**
- If entity exists (not permanently deleted): show current state with key fields
- If entity is soft-deleted: show soft-deleted state with "Deleted" badge + restore link
- If entity does not exist: "Entity no longer exists" message
- Deep links:
  - Task → `/dashboard/tasks?taskId={id}`
  - Project → `/dashboard/projects/{id}`
  - User → `/dashboard/admin` (or user profile page if one exists)
  - Comment → task detail with comment highlighted
  - Team → `/dashboard/teams/{id}`

**4. Snapshot Section (for update/delete events)**
- Collapsible "Show Snapshot" button
- For updates: side-by-side diff view (`before` vs `after`). Highlight changed fields with green (new) / red (old) background.
- For deletes: show the full `before` state as a read-only JSON-like card.
- For creates: show the `after` state.

**5. Related Timeline**
- "Show history for this entity" button
- Fetches all audit logs where `entityType = X AND entityId = Y`
- Shows a vertical timeline of all events on this entity
- Each timeline item: action, actor, timestamp, severity
- Click any timeline item to open its detail modal (navigation stack or replace)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/super-admin/audit/[id]/route.ts` | GET single audit log with snapshots and actor/entity enrichment |
| `src/app/dashboard/super-admin/AuditLogDetailModal.tsx` | Rich detail modal for a single log entry |
| (optionally) `src/lib/audit.ts` | Already exists; replace `getClientIP()` with robust version |

## Files to Modify

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `tag`, `severity` to `activity_logs`; add `activity_log_snapshots` table |
| `src/lib/audit.ts` | Replace `getClientIP()` with robust IP parser (see above) |
| `src/app/api/super-admin/audit/route.ts` | Add `tag` and `severity` query params; return new fields |
| `src/app/api/super-admin/audit/export/route.ts` | Add `tag`/`severity` to CSV; consider JSON export format |
| `src/app/dashboard/super-admin/SuperAdminAuditPanel.tsx` | Add tag+severity filters and badges; make rows clickable; open detail modal |
| `src/app/dashboard/super-admin/SuperAdminClient.tsx` | Import and wire up `AuditLogDetailModal` |
| **Every mutation API route** (see list above) | Add `getClientIP(req)`, `tag`, `severity` to `activityLogs.insert()`; add `activityLogSnapshots.insert()` after mutation |

---

## Migration Strategy

1. **Schema changes** — add `tag`, `severity` to `activity_logs`; create `activity_log_snapshots` table
2. **Generate & run migration** (`bun run db:generate`, `bun run db:migrate`)
3. **Update `getClientIP()`** — robust implementation
4. **Update all mutation routes** to write `tag`, `severity`, `ipAddress`, and snapshots (batch by entity type)
5. **Update audit list API** — add tag+severity filters
6. **Update audit detail API** — create `GET /api/super-admin/audit/[id]`
7. **Update export API** — add new columns
8. **Rewrite audit UI panel** — filters, badges, clickable rows
9. **Build detail modal** — actor, entity, snapshot diff, related timeline
10. **Update `SuperAdminClient.tsx`** to include modal wiring
11. **Run `bun run lint`, `bun run typecheck`, `bun run build`**

---

## Activity Logging

Not applicable — this task IS the activity logging improvement.

---

## Acceptance Criteria

- [x] IP addresses are parsed correctly from all proxy headers; first valid non-private IP is stored
- [x] All mutation API routes include `ipAddress`, `tag`, and `severity` in activity log entries
- [x] All mutation API routes write entity snapshots to `activity_log_snapshots`
- [x] Update operations have both `before` and `after` snapshots; create has `after`; delete has `before`
- [x] Audit log list API supports filtering by `tag` and `severity`
- [x] Audit log detail API returns actor info, entity current state, and all snapshots
- [x] Audit log UI shows tag and severity badges on every row
- [x] Audit log UI has tag and severity filter pills
- [x] Clicking any audit log row opens a detail modal
- [x] Detail modal shows: actor card, event summary, entity card with deep links, snapshot diff, related timeline
- [x] Export CSV includes `tag` and `severity` columns
- [x] Soft-deleted entities are still linkable in the detail modal (depends on soft delete system)
- [x] `bun run lint`, `bun run typecheck`, `bun run build` all pass

---

## Execution Order

1. Schema changes + migration
2. Fix `getClientIP()`
3. Update all mutation routes to write enhanced activity logs + snapshots
4. Update audit list API (filters)
5. Create audit detail API
6. Update export API
7. Rewrite audit UI panel (filters, badges)
8. Build detail modal component
9. Wire modal into superadmin dashboard
10. Lint, typecheck, build
