# TODO - Vellum Project Tasks

## Priority: High

- [ ] **Role & Permission Manager** — Dynamic roles, granular permissions, and presets for superadmin
  > Full plan: [`TODO/role-permission-manager.md`](TODO/role-permission-manager.md)

  Replace the fixed 3-role enum with a DB-backed role system. Superadmins can create custom roles, assign granular permissions, and use presets. Add `roles` and `permissionPresets` tables, update auth to load permissions, add `requirePermission()` helper, build CRUD API routes and management UI, migrate existing role checks.

  - DB: Add `roles` table (name, permissions[], isSystem), `permissionPresets` table, change `users.role` to text
  - Auth: Add `permissions: string[]` to AuthUser, update `getSession()`, add `requirePermission()`
  - API: CRUD for roles + permission presets under `/api/super-admin/`
  - UI: Rewrite `SuperAdminRolesPanel` with editable matrix + preset selector
  - Seed: 3 system roles (superadmin/admin/member) + 6 presets
  - Migration: Gradually replace `requireRole()` and inline role checks with permission checks
  - Acceptance: Superadmin can create/edit/delete roles, assign permissions, apply presets; all auth checks enforced via permissions

- [ ] **Customizable Kanban Board Columns** — Per-project configurable columns with management UI
  > Full plan: [`TODO/kanban-custom-columns.md`](TODO/kanban-custom-columns.md)

  Replace hardcoded 5-column kanban with dynamic, per-project columns. Columns can be created, edited, deleted, reordered. Extract shared components to eliminate duplication across global and project kanban boards.

  - DB: Add `boardColumns` table (projectId, name, key, color, position, isDeletable), change `tasks.status` to text
  - API: CRUD for columns under `/api/projects/[id]/columns/`, reorder endpoint, global defaults endpoint
  - UI: Column management (add/rename/recolor/delete), ColumnMenu, AddColumnForm, ColorPicker
  - Shared: Extract TaskCard, BoardColumn, types, and utils to `src/components/kanban/` and `src/lib/kanban-utils.ts`
  - Seed: Global default columns (backlog/todo/in_progress/review/done), copied to each project on creation
  - Migration: Server components fetch columns from DB, client components use shared components
  - Acceptance: Columns are DB-backed, per-project, fully manageable; no hardcoded statusColumns remain; shared components eliminate duplication

- [ ] **Reorganize AI Agent documentation** - Optimize and restructure project docs for better agent onboarding
  - Create a dedicated `docs/agents/` directory for all agent-facing docs
  - Break `AGENTS.md` and `STRUCTURE.md` into focused, digestible pieces (e.g., `docs/agents/getting-started.md`, `docs/agents/architecture.md`, `docs/agents/database.md`, `docs/agents/api-routes.md`, `docs/agents/common-patterns.md`, `docs/agents/conventions.md`)
  - Avoid duplication — each doc should have a single responsibility
  - Keep `AGENTS.md` as a lightweight hub that links to all pieces with a clear table of contents
  - Remove stale or overly verbose content during the move
  - Acceptance criteria: All docs are in `docs/agents/`, `AGENTS.md` connects them correctly, no duplication, quick to scan

- [x] **Optimistic updates everywhere** - Implement optimistic UI updates across all mutations
  - Task CRUD (create, update, delete, reorder)
  - Project CRUD
  - Team CRUD
  - User management (create, update, delete)
  - Comments (add, edit, delete)
  - Milestones (create, update, delete)
  - Team members (invite, remove, role change)
  - Use React Query/React Mutation or similar for optimistic updates
  - Rollback on error with toast notification
  - Acceptance criteria: All mutations update UI immediately, rollback on error with toast

- [x] **Real-time updates** - Add WebSocket/SSE for live task updates across clients
  - Use Pusher for managed WebSocket/pub-sub
  - Update Kanban board in real-time when tasks change
  - Broadcast task moves, status changes, new comments

- [x] **Kanban Add task button UX fix** - Fix broken Add task button and improve placement
  - Investigate why the Add task button does not create tasks successfully
  - Add a Project dropdown field to the new-task form in both Kanban views
  - Move the Add task button from the bottom of the column to the top (next to the column header)
  - Acceptance criteria: Clicking Add task actually creates a task; button is at the top of each column

- [x] **Notifications bell** - Add in-app notification centre
  - Add a bell icon with unread badge in the top header / sidebar
  - Dropdown panel showing recent notifications (task assignments, mentions, status changes, comments)
  - Mark individual / all notifications as read
  - Store notifications in a new `notifications` table (userId, type, title, content, read, createdAt)
  - Trigger notifications on task assignment, mention, status change, comment, due date approaching
  - Acceptable to use Pusher for real-time badge increments or simple polling
  - Acceptance criteria: Users see a bell with unread count, can open a dropdown, and mark notifications as read

- [x] **Drag-and-drop Kanban** - Implement task reordering with @dnd-kit
  - Drag tasks between columns (status changes)
  - Drag tasks within column (position changes)
  - Persist position changes to database
  - Optimistic UI updates

- [x] **Task comments** - Full comment system on tasks
  - API routes (`/api/comments` GET/POST, `/api/comments/[id]` PATCH/DELETE)
  - Display in TaskDetailModal with edit/delete UI
  - Optimistic updates via React Query hooks
  - Activity logging for create/update/delete
  - Real-time comment notifications (future)
  - @mention support (future)

- [ ] **File attachments** - Allow file uploads on tasks/projects
  - Integrate with S3/R2/Cloudinary
  - Add `attachments` table to schema
  - Display in UI with previews

- [ ] **Soft Delete System** — Soft-delete entities instead of permanent deletion; superadmin recovery and audit
  > Full plan: [`TODO/soft-delete-system.md`](TODO/soft-delete-system.md)

  Replace all permanent `DELETE` operations with soft deletes that preserve data integrity for audit trails. Add `deletedAt` and `deletedBy` columns to all applicable tables, update queries to exclude soft-deleted rows by default, provide recovery APIs, and update the audit log to reference preserved deleted entities.

  - DB: Add `deletedAt`/`deletedBy` columns to `tasks`, `projects`, `comments`, `teams`, `projectMilestones`, `projectNotes`, `teamMembers`
  - API: Replace `db.delete()` with `db.update({ deletedAt, deletedBy })` in task, project, comment, team, milestone, note delete routes
  - API: `PATCH /api/super-admin/restore` — bulk or individual restore for soft-deleted entities (superadmin only)
  - API: `GET /api/super-admin/trash` — list all soft-deleted items with entity type, title, deleted by, deleted at
  - Queries: Add `isNull(table.deletedAt)` to all SELECT queries (or Drizzle view wrapper)
  - Foreign keys: Do NOT cascade on delete; keep soft-deleted parent rows so audit logs remain linkable
  - Superadmin UI: "Trash" panel in superadmin dashboard to browse, filter, and restore soft-deleted items
  - Acceptance criteria: No entity is permanently deleted by regular users; deleted items disappear from normal views; superadmin can browse and restore; audit logs link to preserved records

- [ ] **Audit Log — Enhanced Logs & Detail Modals** — Fix IP capture, add filters, tags, and clickable detail modals with deep linking
  > Full plan: [`TODO/audit-log-improvements.md`](TODO/audit-log-improvements.md)

  Improve the superadmin audit log tab to fix IP address reliability, add structured tags for quick filtering, and add a rich detail modal for every log entry. The modal shows full event context, snapshots from `activity_log_snapshots`, and clickable links to related users, tasks, projects, and other entities. Depends on **Soft Delete System** so that deleted entities remain linkable in the trail.

  - Fix IP capture: Use `x-forwarded-for` parsing (first IP), fallback through `x-real-ip`/`x-client-ip`/`cf-connecting-ip`; handle private/reserved ranges; store as text array if multiple hops
  - DB: Add `activity_log_snapshots` table (`logId`, `tableName`, `recordId`, `snapshot` JSONB, `snapshotType`) to preserve entity state at time of event
  - DB: Add `tag`, `severity` columns to `activity_logs` (severity: `info`, `warning`, `critical`)
  - API: Update all mutation routes to write snapshots on create, update, delete
  - API: `GET /api/super-admin/audit/[id]` — single log entry with joined snapshot data
  - UI: Tag filters (pill buttons) for action types, severity, entity type; multi-select checkboxes
  - UI: Click any audit log row to open a detail modal (Sheet or Dialog)
  - Detail modal: actor card (avatar, name, email, IP, timestamp, user agent), entity card (current state + snapshot diff), related links (e.g. task title → `/dashboard/tasks?taskId=...`), action timeline for that entity
  - Export: Include snapshot diffs in CSV/JSON export
  - Acceptance criteria: IP addresses are accurate and parsed correctly; every log entry is clickable and opens a modal; modal shows full context with deep links; snapshots preserve entity state; tags and filters work; export includes snapshots

## Priority: Medium

- [ ] **Active session management for all users** - Allow users to view and manage their own active sessions
  - API: `GET /api/sessions/me` — list current user's active sessions with device/IP info
  - API: `DELETE /api/sessions/me/[id]` — revoke one of own sessions (cannot revoke current)
  - UI: "Active Sessions" section in user settings / profile page
  - Show session details: browser, OS, IP, location, last active time, created at
  - Option to "Log out all other devices" (revoke all except current)
  - Self-protection: prevent revoking the current session (show disabled state)
  - Acceptance criteria: Users can see all their active sessions, revoke individual or all others, UI updates optimistically

- [ ] **Telegram bot integration** - Platform-wide Telegram bot for notifications
  - Superadmin configures a single Telegram bot API token in platform settings (`telegram_bot_token` in a `platform_settings` table or env var)
  - Bot connects to a Telegram supergroup with topics: map notification types (task assignments, status changes, comments, mentions, due dates) to specific forum topics
  - Bot connects to Telegram channels for broadcast notifications (release announcements, platform updates)
  - Users bind their Telegram account via a single-use pairing code: `/start <code>` in the bot DMs links their Telegram to their Vellum account
  - Generate random 6-character codes stored in `telegram_pairing_codes` table (code, userId, used, expiresAt)
  - On successful pairing, store `telegram_chat_id` and `telegram_username` in `users` table
  - Users choose Telegram as a notification channel in notification preferences (alongside push, email, in-app)
  - Send notifications via Telegram Bot API (`sendMessage`) using the user's `chat_id` or the mapped supergroup topic
  - Superadmin can test bot connectivity and see paired user count in super admin panel
  - Acceptance criteria: Superadmin can configure bot token, users can pair via code, notifications arrive in Telegram per user preferences, supergroup topics receive typed notifications

- [ ] **Email notifications** - Send emails for assignments, mentions, due dates
  - Integrate Resend or SendGrid
  - Notification preferences per user
  - Template system for emails

- [x] **Push notifications** - Send push notifications for events and add user settings
  - Integrate Web Push API (VAPID) or Push API service (e.g., Web Push, OneSignal)
  - Support events: task assigned, mentioned, due date approaching, status changed, comments, mentions
  - User notification preferences page (per event type, per channel: push/email/in-app)
  - Per-team/project notification preferences
  - VAPID key management for Web Push
  - Service worker for receiving push notifications
  - Acceptance criteria: Users can enable/disable push per event type, receive push notifications, manage preferences in settings page

- [ ] **Actions without notifications** - Add options to perform actions without sending notifications
  - "Update without notifying" checkbox/toggle on task updates, assignments, status changes
  - "Comment without notifying" option on comments
  - "Assign without notifying" option when assigning tasks
  - "Bulk actions without notifications" for bulk operations
  - Per-action toggle in modals and forms
  - Acceptance criteria: Users can choose to skip notifications per action, setting persists per session

- [ ] **Activity log for notification decisions** - Log when users choose not to send notifications
  - Extend activity log schema to include `notificationSent` boolean and `notificationChannels` array
  - Log entries for: task updates, assignments, comments, status changes
  - Include `notificationDecision` field: `sent` | `skipped_by_user` | `skipped_by_preference` | `failed`
  - Display in activity log details: show notification decision and channels used/skipped
  - Acceptance criteria: Activity log shows whether notifications were sent/skipped for each action, with reason

- [ ] **Project milestones** - Full milestone tracking UI
  - API routes exist (`/api/projects/[id]/milestones`, `/api/milestones/[id]`)
  - Timeline/Gantt view
  - Milestone progress tracking

- [ ] **Team management UI** - Complete team CRUD and member management
  - Invite members via email
  - Role management (lead, contributor, viewer)
  - Team settings page

- [x] **Bug: Admin user creation not reflected in UI** - Fix missing UI update and loading state
  - New user not appearing in user list after creation
  - Add loading animation during user creation
  - Acceptance criteria: User list refreshes automatically, loading spinner shows during request

- [ ] **Search & filters** - Global search across projects, tasks, users
  - Full-text search (PostgreSQL tsvector or Meilisearch)
  - Advanced filters (date ranges, assignee, priority, etc.)
  - Saved filters

- [ ] **Dark/Light theme toggle** - Add theme switching
  - Persist in localStorage
  - System preference detection
  - Tailwind dark mode class strategy

- [ ] **Keyboard shortcuts** - Power user shortcuts
  - `n` = new task, `/` = search, `?` = help
  - Kanban navigation (arrows, enter to edit)

## Priority: Low

- [ ] **Project notes** - Rich text notes per project
  - API routes exist (`projectNotes` table)
  - RichTextEditor integration
  - Version history

- [ ] **Activity feed improvements** - Filtering, pagination, real-time
  - Filter by entity type, user, date range
  - Infinite scroll

- [ ] **User profiles** - Avatar upload, profile editing
  - Avatar upload to cloud storage
  - Name, email, password change
  - 2FA support

- [ ] **Reporting dashboard** - Velocity, burndown, workload charts
  - Chart.js or Recharts integration
  - Export to PDF/CSV

- [ ] **Mobile responsive improvements** - Better mobile UX
  - Collapsible sidebar on mobile
  - Touch-friendly Kanban
  - PWA support (manifest, service worker)

- [ ] **Mobile-first limited-feature mode** - Lightweight mobile experience for messages, notifications, stats
  - Mobile-first responsive layout (collapsible nav, stacked cards, touch targets >=44px)
  - Dedicated mobile routes/pages: `/mobile/messages`, `/mobile/notifications`, `/mobile/stats`
  - Limited feature set: read-only messages, notifications list with mark-read, dashboard stats summary
  - Bottom navigation bar for mobile navigation (Messages, Notifications, Stats, Profile)
  - Touch-friendly interactions (swipe to dismiss notifications, pull-to-refresh)
  - PWA manifest + service worker for offline notifications view
  - Acceptance criteria: Mobile users can read messages, view/clear notifications, see key stats without desktop UI complexity

- [ ] **API rate limiting** - Protect API endpoints
  - Upstash Redis or in-memory
  - Per-user/IP limits

- [ ] **Audit logging** - Enhanced security audit trail
  - Login attempts, permission changes
  - Export for compliance

- [x] **Super Admin Dashboard** - Comprehensive management and monitoring for super admins
  > Split into subtasks below. Tick each one as it's completed so the workload can be divided across sessions / agents.

  **Prerequisites** (new DB table + migrations)
  - [x] Add `user_sessions` table (user login history — IP, userAgent, success/failure)  
  `fields: id, userId, ipAddress, userAgent, success (bool), failedReason (text), createdAt`
  - [x] Add `user_status` enum (`active`, `inactive`, `banned`) to `users` table
  - [x] Run `bun run db:generate` + `bun run db:migrate`

  **Part 1 — Super Admin Route & Sidebar Link**
  - [x] Add `/dashboard/super-admin` route (only accessible to `superadmin` role, redirect others)
  - [x] Add `SuperAdmin` link in sidebar (visible only to `superadmin`)
  - [x] Create server layout for super-admin section that checks role

  **Part 2 — Users Management Table**
  - [x] Create `SuperAdminUsersPanel` component
  - [x] Server action/API: `GET /api/super-admin/users` — list users with `status`
  - [x] UI: Data table with columns — Name, Email, Role, Status, Created At
  - [x] UI: Inline actions — Change status (Active / Inactive / Banned), Change role
  - [x] Optimistic updates via React Query + rollback on error

  **Part 3 — Real-time User Activity Monitoring**
  - [x] Create `SuperAdminActivityPanel` component
  - [x] API: `GET /api/super-admin/activity` — activity logs enriched with IP from `user_sessions`
  - [x] UI: Live feed (polling 5s) of logins, failed attempts, user actions
  - [x] Show sparklines / mini stats for: logins last 24h, failed attempts, active users 24h

  **Part 2b — Users Table Enhancements**
  - [x] Show `lastLoginAt` and `lastIp` in Users table via join to `user_sessions`
  - [x] Sort/filter by last login date
  - [x] Add "Last seen" relative time column (e.g. "2h ago")

  **Part 2c — Status-based Login Enforcement**
  - [x] Verify `inactive` and `banned` users are blocked from logging in
  - [x] Define difference: `inactive` = user-initiated pause (can be re-activated), `banned` = admin-enforced block (requires admin intervention)
  - [x] Return specific error messages: "Account inactive" / "Account suspended"
  - [x] Log blocked login attempts in `user_sessions`
  - [x] Banned users have existing sessions destroyed immediately on `getSession()`

  **Part 4 — Session Management**
  - [x] API: `GET /api/super-admin/sessions` — list all active sessions with user name, IP, last seen
  - [x] API: `DELETE /api/super-admin/sessions/[id]` — revoke a session
  - [x] UI: Table view of active sessions with Revoke button
  - [x] Self-protection: superadmin cannot revoke their own session

  **Part 5 — Enhanced Audit Logs**
  - [x] Extend `activity_logs` schema to include `ipAddress` column
  - [x] Run migration `0003_whole_kang.sql`
  - [x] API: `GET /api/super-admin/audit` with filters (user, action, date range, IP)
  - [x] API: `GET /api/super-admin/audit/export?format=csv` — CSV export of filtered results
  - [x] UI: Filterable audit log table with date-range picker + pagination
  - [x] UI: Export CSV button downloads filtered results

  **Part 6 — System Health Metrics**
  - [x] Create `SuperAdminHealthPanel` component
  - [x] API: `GET /api/super-admin/health` — DB connection stats, recent API latency, error rate (last 24h)
  - [x] UI: Cards / charts: active sessions, total users, tasks, projects, user status breakdown, 24h activity, failed logins, top actions

  **Part 7 — Role / Permission Matrix**
  - [x] Create `SuperAdminRolesPanel` component
  - [x] UI: Matrix table (roles × permissions) showing what each role can do
  - [x] API: `GET /api/super-admin/permissions` — list predefined permissions per role

  **Acceptance criteria (overall)**
  - Super admin can view all users with last login/IP and status
  - Real-time activity monitoring feeds update automatically
  - Sessions can be viewed and revoked
  - Audit logs are filterable and exportable
  - System health is visible at a glance
  - Role matrix explains who can do what
  - All panels gated behind `superadmin` role check

- [x] **Update README.md** - Add project context and storytelling sections
  - Project goal and what problem it solves
  - Inspiration and why it was built
  - Roadmap overview (linking to TODO.md)
  - Name etymology (why "Vellum")
  - Keep it concise but informative for visitors and new contributors

## Technical Debt

- [ ] **Add test suite** - Unit + integration tests
  - Vitest for unit tests
  - Playwright for E2E
  - Test API routes, auth, db utilities

- [ ] **TypeScript strictness** - Enable stricter TS config
  - `noUncheckedIndexedAccess`
  - `exactOptionalPropertyTypes`
  - Fix resulting errors

- [ ] **Error boundaries** - React error boundaries for graceful failures
  - Per-page and per-component boundaries
  - Error reporting (Sentry)

- [ ] **Loading states** - Consistent skeleton loaders
  - Standardized loading components
  - Suspense boundaries

- [ ] **Accessibility audit** - WCAG 2.1 AA compliance
  - Semantic HTML
  - Focus management
  - ARIA labels
  - Color contrast

- [ ] **Database indexes** - Add missing indexes for query performance
  - Composite indexes for common filter combinations
  - Partial indexes for status filters

## New Features (Ideas)

- [x] **Kanban board as dedicated page/tab** - Improve UX with dedicated Kanban view
  - Separate page/tab for full-screen Kanban board
  - Better drag-and-drop UX with more space
  - Filter and group options in sidebar
  - Acceptance criteria: Kanban accessible via dedicated route, responsive layout, filters work

- [ ] **Time tracking** - Log time on tasks, reports
- [ ] **Recurring tasks** - Cron-style recurring tasks
- [ ] **Task dependencies** - Blocking/blocked relationships
- [ ] **Webhooks** - Outgoing webhooks for integrations
- [ ] **Slack/Discord integration** - Notifications to channels
- [ ] **Calendar view** - Tasks with due dates on calendar
- [ ] **Export/Import** - JSON/CSV backup and restore
- [ ] **Multi-language (i18n)** - Translation system
- [ ] **Public project views** - Shareable read-only links

---

## Task Format

When adding tasks, use:

```
- [ ] **Title** - Description
  > Full plan: [`TODO/task-filename.md`](TODO/task-filename.md)

  Brief summary of what needs to be done.

  - Sub-task 1
  - Sub-task 2
  - Acceptance criteria: ...
```

## Task Detail Files (`TODO/`)

Complex tasks should have a dedicated file in the `TODO/` directory. Each file contains the full context an agent needs to work on the task autonomously:

- **Overview** — What and why
- **Current State** — Existing code, file paths, line numbers
- **Database Changes** — Schema modifications with exact Drizzle definitions
- **API Routes** — New endpoints with request/response shapes
- **UI Changes** — Components to create/modify
- **Files to Create/Modify** — Complete file lists
- **Migration Strategy** — Step-by-step execution order
- **Acceptance Criteria** — Definition of done

Agent workflow: Read `TODO.md` → pick a task → read its linked `TODO/*.md` file → execute.

## Status Tags

- `priority: high` - Critical for MVP/launch
- `priority: medium` - Important but not blocking
- `priority: low` - Nice to have
- `status: pending` - Not started
- `status: in_progress` - Currently being worked on
- `status: review` - PR open, awaiting review
- `status: done` - Completed and merged