# DONE - Completed Vellum Features

This document tracks features and tasks that have been fully implemented, tested, and merged into the project. For upcoming work, see [TODO.md](TODO.md).

---

## Core Platform

### Optimistic UI Updates
> Full optimistic-update pattern across all mutations using React Query.

- **Task CRUD** — create, update, delete, reorder
- **Project CRUD** — create, update, delete
- **Team CRUD** — create, update, delete
- **User management** — create, update, delete
- **Comments** — add, edit, delete
- **Milestones** — create, update, delete
- **Team members** — invite, remove, role change
- Pattern: `onMutate` snapshot → apply change → `onError` rollback + toast → `onSuccess` sync → `onSettled` invalidate

### Real-Time Collaboration
> Live task updates across all connected clients via Pusher.

- Kanban board updates instantly when tasks change
- Task moves and status changes broadcast to all viewers
- New comments appear in real-time in TaskDetailModal
- Toast notifications for updates from other users (skips self)
- Architecture: Pusher server channels + client singleton with ref counting

### Drag-and-Drop Kanban
> Full task reordering with @dnd-kit.

- Drag tasks between columns (status changes)
- Drag tasks within column (position changes)
- Persist position changes to database
- Optimistic UI updates for instant feedback

---

## Kanban & Task Management

### Kanban Board as Dedicated Page
> Full-screen Kanban view accessible via dedicated route.

- Route: `/dashboard/kanban`
- Cross-project task view with all tasks
- Filter and group options in sidebar
- Responsive layout
- Drag-and-drop with full space

### Kanban Add Task Button UX Fix
> Fixed broken Add task button and improved placement.

- Root cause identified and fixed: Add task button now successfully creates tasks
- Added Project dropdown field to new-task form in both Kanban views
- Moved Add task button from bottom of column to top (next to column header)

### Task Comments
> Full comment system on tasks with optimistic updates.

- API: `GET/POST /api/comments`, `PATCH/DELETE /api/comments/[id]`
- Display in TaskDetailModal with edit/delete UI
- Optimistic updates via React Query hooks
- Activity logging for create/update/delete
- Real-time comment updates via Pusher

---

## Notifications

### Push Notifications
> Browser push notifications via Web Push (VAPID).

- Service worker registration at `/sw.js`
- VAPID key management for Web Push
- Support events: task assigned, mentioned, due date approaching, status changed, comments
- User notification preferences page (per event type)
- Per-team/project notification preferences
- Users can enable/disable push per event type

### In-App Notification Bell (July 2026)
> Notification centre with dropdown panel and real-time badge.

- Bell icon with unread count badge in sidebar header
- Dropdown panel showing 50 most recent notifications
- Mark individual / all notifications as read with optimistic updates
- Stores notifications in `notifications` table (userId, type, title, content, read, entityType, entityId, actorUserId)
- Triggered on: task assignment, status change, new comment
- Real-time badge updates via Pusher user-specific channel (`user-${userId}`)
- Polling fallback every 30 seconds
- Respects `inAppEnabled` preference per event type
- API: `GET /api/notifications`, `PATCH /api/notifications/[id]`, `POST /api/notifications/mark-all-read`
- Components: `NotificationBell.tsx`, `useNotifications.ts`
- Utilities: `sendInAppNotification()` in `src/lib/notifications.ts`

### Soft Delete System (July 2026)
> Replace permanent deletion with soft deletes; superadmin Trash UI for recovery.

- DB: `deletedAt`/`deletedBy` columns added to tasks, projects, comments, teams, projectMilestones, projectNotes, teamMembers
- All read queries filtered with `isNull(deletedAt)` to exclude soft-deleted rows
- All DELETE routes converted to soft delete (tasks, projects, comments, teams, teamMembers, milestones)
- API: `PATCH /api/super-admin/restore` — bulk restore with activity logging (superadmin only)
- API: `GET /api/super-admin/trash` — paginated listing with type/search filters
- UI: `SuperAdminTrashPanel.tsx` — table with select-all, bulk restore, confirmation modal, pagination
- Trash tab added to SuperAdminClient dashboard
- Migration: `0006_powerful_scorpion.sql`

### Audit Log Enhancement (July 2026)
> Fixed IP capture, added tags/severity, snapshots, and rich detail modals.

- DB: `activity_log_snapshots` table (`logId`, `tableName`, `recordId`, `snapshot` JSON, `snapshotType`)
- DB: `tag` (text) and `severity` (text, default "info") columns on `activity_logs`
- Fixed `getClientIP()` — parses multiple headers, validates format, filters private IPs
- `writeActivityLog()` helper — auto-classifies tag (security/user_action/data_change) and severity (info/warning/critical), writes snapshots
- All 11 mutation routes updated to use `writeActivityLog` with before/after snapshots
- API: `GET /api/super-admin/audit/[id]` — full detail with snapshots, actor, entity state, entity timeline
- API: `GET /api/super-admin/audit` — tag/severity filters added
- API: CSV export now includes tag and severity columns
- UI: `AuditLogDetailModal.tsx` — actor card, severity/tag badges, snapshot diff view, entity timeline
- UI: `SuperAdminAuditPanel.tsx` — tag/severity filter pills, severity badges, clickable rows opening detail modal
- Migration: `0007_next_whistler.sql`
---

## Admin & Super Admin

### Super Admin Dashboard
> Comprehensive management and monitoring for super admins.

**Prerequisites**
- `user_sessions` table — login history with IP, userAgent, success/failure
- `user_status` enum (`active`, `inactive`, `banned`) on `users` table
- Migrations generated and applied

**Users Management**
- Route: `/dashboard/super-admin` (superadmin-only)
- Sidebar link visible only to superadmin
- Server layout with role check
- Users table: Name, Email, Role, Status, Created At, Last Login, Last IP
- Inline actions: Change status (Active/Inactive/Banned), Change role
- Sort/filter by last login date, "Last seen" relative time column
- Optimistic updates with rollback on error

**Real-Time Activity Monitoring**
- Live feed polling every 5 seconds
- Unified feed of logins, failed attempts, user actions
- 24h mini stats: logins, failed attempts, active users
- Sparklines and stat cards

**Status-Based Login Enforcement**
- `inactive` users blocked at login with "Account inactive" error
- `banned` users blocked at login with "Account suspended" error
- Banned users have existing sessions destroyed immediately on `getSession()`
- Blocked login attempts logged in `user_sessions`
- Difference: `inactive` = user-initiated pause, `banned` = admin-enforced block

**Session Management**
- `GET /api/super-admin/sessions` — list all active sessions
- `DELETE /api/super-admin/sessions/[id]` — revoke a session
- Self-protection: superadmin cannot revoke own session

**Enhanced Audit Logs**
- `ipAddress` column added to `activity_logs`
- `GET /api/super-admin/audit` with filters (user, action, date range, IP)
- `GET /api/super-admin/audit/export?format=csv` — CSV export
- Filterable table with date-range picker + pagination
- Export button downloads filtered results

**System Health Metrics**
- `GET /api/super-admin/health`
- Cards/charts: active sessions, total users, tasks, projects
- User status breakdown (active/inactive/banned)
- 24h activity summary, failed logins, top actions

**Role / Permission Matrix**
- `GET /api/super-admin/permissions`
- Matrix table (roles × permissions) showing what each role can do
- Toggle highlighting per role column

### Bug Fix: Admin User Creation
> Fixed missing UI update and loading state.

- User list now refreshes automatically after creation
- Loading spinner shows during creation request
- Optimistic update pattern applied

---

## Documentation

### README.md Storytelling
> Added project context and storytelling sections.

- "Why Vellum?" — explains the problem it solves
- "Our Story" — journey from Jira/Trello/Vikunja to building Vellum
- "Name & Meaning" — historical vellum material and project connection
- "Roadmap" — links to TODO.md for planned features

### CONTRIBUTIONS.md Rewrite
> Rewritten for human contributors.

- Reduced from 250 to ~100 lines
- Removed AGENTS.md dependency for humans
- Added critical conventions inline (activity logging, optimistic updates)
- Made `dev` branch target explicit
- All relevant conventions now human-facing
---

## Architecture Decisions (Completed)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Server Components by default | Performance + simpler data fetching | ✅ Applied |
| Custom session auth (not NextAuth) | Fine-grained control, simpler self-host | ✅ Applied |
| Drizzle ORM over Prisma | Type-safe, lightweight, no client gen | ✅ Applied |
| Pusher over raw WebSockets | Managed infra, simpler scaling | ✅ Applied |
| Bun over npm/pnpm | Faster install, native TS support | ✅ Applied |
| React Query + optimistic updates | Fast UI, easy rollback on error | ✅ Applied |
| Activity logging on every mutation | Full audit trail, analytics ready | ✅ Applied |
| Soft deletes over permanent DELETE | Preserves audit trail, recoverable data | ✅ Applied |

---

## How to Update This File

When a task from [TODO.md](TODO.md) is fully completed and merged:

1. Move its entry from TODO.md → DONE.md (this file)
2. Add the completion date in parentheses
3. Update any related documentation (STRUCTURE.md, AGENTS.md, README.md links)
4. Commit with: `docs(done): add <feature-name> to completed list`

---

*Last updated: July 2026*
