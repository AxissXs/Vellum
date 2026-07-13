# TODO - Vellum Project Tasks

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

- [ ] **File attachments** - Allow file uploads on tasks/projects
  - Integrate with S3/R2/Cloudinary
  - Add `attachments` table to schema
  - Display in UI with previews

## Priority: Medium

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

- [ ] **Super Admin Dashboard** - Comprehensive management and monitoring for super admins
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