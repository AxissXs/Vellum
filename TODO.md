# TODO - Project Tasks

## Agile Workflow

Agile cadence layered on top of the priority buckets below. **Cadence is customizable per project** — the values here are templates, not fixed rules. Set the active window in `SPRINT_CURRENT` (see [Sprints](#sprints)).

### Cadence (customizable)
- **Sprint length:** default 2 weeks; adjust per project (1-week, 3-week, or milestone-based all valid).
- **Grooming day:** backlog refinement before each sprint starts.
- **Retro day:** last day of each sprint.
- Define these per project — do not hardcode across the repo.

### Ceremonies
- **Backlog grooming** — refine/prioritize items; promote `New Features (Ideas)` → priority buckets when committed.
- **Sprint planning** — pull top-priority `[ ]` items into the current sprint; mark them `status: in_progress`.
- **Daily standup** — three questions (done / yesterday / blockers). Status sync only; no doc churn.
- **Sprint retro** — append to `retro/` log: what went well / what went wrong / action items. See [Sprints](#sprints) for the retro file convention.

### Task lifecycle
Maps onto the existing status tags:
`pending` → `in_progress` → `review` (PR open) → `done` (merged).
Use the status tags defined in [Status Tags](#status-tags) on every task line.

## Priority: High

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

- [ ] **Notifications bell** - Add in-app notification centre
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

- [x] **Agile tools (sprints, standup, retro, planning)** - Full-stack agile ceremony support
  - Schema: `sprints`, `standups`, `retro_items`, `task_status_history`; `tasks.sprintId`, `tasks.estimate`
  - API: `/api/sprints`, `/api/sprints/[id]`, `/api/sprints/[id]/burndown`, `/api/standups`, `/api/retros`
  - Hooks: `useSprints`, `useStandups`, `useRetros`; extended `useTasks` for sprintId/estimate
  - UI: `/dashboard/sprints` list + `/dashboard/sprints/[id]` detail (board, burndown, planning, standup, retro)
  - Acceptance criteria: Create sprint, assign tasks, burndown chart, daily standup upsert, retro CRUD

- [ ] **File attachments** - Allow file uploads on tasks/projects
  - Integrate with S3/R2/Cloudinary
  - Add `attachments` table to schema
  - Display in UI with previews

## Priority: Medium

- [ ] **Email notifications** - Send emails for assignments, mentions, due dates
  - Integrate Resend or SendGrid
  - Notification preferences per user
  - Template system for emails

- [ ] **Push notifications** - Send push notifications for events and add user settings
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

- [ ] **Mobile responsive improvements** - Better mobile UX (status: in_progress)
  - [x] Collapsible sidebar on mobile (off-canvas drawer + hamburger top bar below `lg`)
  - [x] Touch-friendly Kanban (always-visible drag grip on touch, pointer-based drag)
  - [ ] PWA support (manifest, service worker) — deferred to a later pass

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

- [ ] **Super Admin Dashboard** - Comprehensive management and monitoring for super admins
  > Split into subtasks below. Tick each one as it's completed so the workload can be divided across sessions / agents.

  **Prerequisites** (new DB table + migrations)
  - [x] Add `user_sessions` table (user login history — IP, userAgent, success/failure)  
  `fields: id, userId, ipAddress, userAgent, success (bool), failedReason (text), createdAt`
  - [x] Add `user_status` enum (`active`, `inactive`, `banned`) to `users` table
  - [x] Run `deno task db:generate` + `deno task db:push`

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
  - [ ] Create `SuperAdminActivityPanel` component
  - [ ] API: `GET /api/super-admin/activity` — activity logs enriched with IP from `user_sessions`
  - [ ] UI: Live feed (polling 5s) of logins, failed attempts, user actions
  - [ ] Show sparklines / mini stats for: logins last 24h, failed attempts, active right now

  **Part 4 — Session Management**
  - [ ] API: `GET /api/super-admin/sessions` — list all active sessions with user name, IP, last seen
  - [ ] API: `DELETE /api/super-admin/sessions/[id]` — revoke a session
  - [ ] UI: Table view of active sessions with Revoke button

  **Part 5 — Enhanced Audit Logs**
  - [ ] Extend `activity_logs` schema to include `ipAddress` column
  - [ ] API: `GET /api/super-admin/audit` with filters (user, action, date range, IP)
  - [ ] UI: Filterable audit log table with date-range picker and user dropdown
  - [ ] API: `GET /api/super-admin/audit/export?format=csv|pdf` — export filtered results

  **Part 6 — System Health Metrics**
  - [ ] Create `SuperAdminHealthPanel` component
  - [ ] API: `GET /api/super-admin/health` — DB connection stats, recent API latency, error rate (last 24h)
  - [ ] UI: Cards / charts: DB pool size, avg response time, 5xx count, active sessions

  **Part 7 — Role / Permission Matrix**
  - [ ] Create `SuperAdminRolesPanel` component
  - [ ] UI: Matrix table (roles × permissions) showing what each role can do
  - [ ] API: `GET /api/super-admin/permissions` — list predefined permissions per role

  **Acceptance criteria (overall)**
  - Super admin can view all users with last login/IP and status
  - Real-time activity monitoring feeds update automatically
  - Sessions can be viewed and revoked
  - Audit logs are filterable and exportable
  - System health is visible at a glance
  - Role matrix explains who can do what
  - All panels gated behind `superadmin` role check

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

## Sprints

> `SPRINT_CURRENT`: <set to current sprint label, e.g. `Sprint 1`>

Sprint execution log. Each sprint pulls from the priority buckets above. Retros live in `retro/`.

- **Sprint 1 (YYYY-MM-DD → YYYY-MM-DD)** — goal: <one line>
  - [ ] TODO.md §"Item" (status: in_progress)
  - [x] TODO.md §"Item" (status: done)
  - Retro: [retro/sprint-1.md](retro/sprint-1.md)

- **Sprint 2 (YYYY-MM-DD → YYYY-MM-DD)** — goal: <one line>
  - [ ] TODO.md §"Item" (status: in_progress)
  - Retro: [retro/sprint-2.md](retro/sprint-2.md)

### Retro log convention
- Folder: `retro/` (one markdown file per sprint, e.g. `retro/sprint-1.md`).
- Cadence: written at end of each sprint (customizable).
- Template:
  ```markdown
  # Sprint N Retro (YYYY-MM-DD → YYYY-MM-DD)

  ## Goal
  <sprint goal>

  ## What went well
  -

  ## What went wrong
  -

  ## Action items
  - [ ] <action> → owner
  ```

---

## Task Format

When adding tasks, use:

```
- [ ] **Title** - Description
  - Sub-task 1
  - Sub-task 2
  - Acceptance criteria: ...
```

## Status Tags

- `priority: high` - Critical for MVP/launch
- `priority: medium` - Important but not blocking
- `priority: low` - Nice to have
- `status: pending` - Not started
- `status: in_progress` - Currently being worked on
- `status: review` - PR open, awaiting review
- `status: done` - Completed and merged