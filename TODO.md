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

- [ ] **File attachments** - Allow file uploads on tasks/projects
  - Integrate with S3/R2/Cloudinary
  - Add `attachments` table to schema
  - Display in UI with previews

- ~~**Active session management for all users**~~ ✅ — View/revoke own sessions in Settings page, API at `/api/sessions/me`

- ~~**Application versioning**~~ ✅ — Version in `package.json`, `NEXT_PUBLIC_APP_VERSION` env var, visible in sidebar and superadmin health panel

- [ ] **Email notifications** - Send emails for assignments, mentions, due dates
  - Integrate Resend or SendGrid
  - Notification preferences per user
  - Template system for emails

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

- ~~**Enhanced toast notifications**~~ ✅ — Loading → success/error toasts for all CRUD mutations across tasks, projects, teams, comments, users, milestones

- ~~**Fix select dropdown styling**~~ ✅ — Fixed with `color-scheme: dark` in `globals.css`
- ~~**Fix select click propagation in users table**~~ ✅ — Added `e.stopPropagation()` to role/status selects

- [ ] **Comment replies** - Threaded replies on task comments with notifications
  - Add `parentId` column to `comments` table (nullable, self-referencing FK)
  - API: `POST /api/comments` accepts optional `parentId` to create a reply
  - UI: "Reply" button on each comment, opens inline reply form
  - Display replies nested under parent comment (1 level deep, not infinite thread)
  - Reply count badge on parent comment if it has replies
  - Send notification to parent comment author when someone replies (via `sendNotification()`)
  - Real-time reply updates via Pusher
  - Acceptance criteria: Users can reply to any comment, replies are visually nested, parent comment author gets notified, real-time works

- ~~**User impersonation**~~ ✅ — Superadmin can impersonate any non-superadmin user, see banner, stop to revert; audit log records it
  - ~~"Impersonate" button in user detail modal and inline in users table~~
  - ~~`POST /api/super-admin/impersonate` — creates a new session as the target user, sets a different cookie~~
  - ~~Show banner at top of screen: "Impersonating {name} — [Stop Impersonating]"~~
  - ~~Stop impersonation reverts to superadmin session~~
  - ~~Log impersonation in audit log with `action: "impersonated_user"`~~
  - ~~Only superadmin can impersonate; cannot impersonate another superadmin~~

- [ ] **Task card assignee avatars** - Show assigned members on task cards
  > Depends on: User profiles (avatar upload)
  - Fetch assignee avatar URL with task data (already in `tasks` via join to `users`)
  - Display assignee avatar(s) on task cards in kanban, task lists, and any task previews
  - Show up to 2 avatars inline, "+N" badge if more
  - Fallback to initials if no avatar
  - Acceptance criteria: Task cards show assigned user avatars, works in kanban and task list views

- [ ] **User last seen tracking** - Record every authenticated request to update user's last activity
  > Depends on: Feature flags system (must be toggleable)
  - Add `lastSeenAt` (timestamp) and `lastSeenIp` (text) columns to `users` table
  - Create a global middleware or hook that fires on every authenticated API request
  - Update `users.lastSeenAt` and `users.lastSeenIp` on each request (throttled to max once per 60s per user to reduce DB load)
  - Display "Last seen" column in superadmin users table (timeAgo format)
  - Display last seen in user detail modal
  - Gated behind a feature flag: `tracking.lastSeen` — when disabled, no DB writes happen
  - Acceptance criteria: Superadmin sees accurate "last seen" per user, DB writes are throttled, feature can be toggled off

- [ ] **Feature flags system** - Superadmin-controlled enable/disable for platform features
  > Full plan: [`TODO/feature-flags.md`](TODO/feature-flags.md)

  Add a `feature_flags` table and a superadmin UI to toggle features on/off. Every optional feature checks its flag before running. This reduces DB load, keeps the platform simple, and lets admins tailor Vellum to their needs. Work in 3 phases:

  **Phase 1 — Core infrastructure:**
  - DB: `feature_flags` table (key, enabled, label, description, category, createdAt, updatedAt)
  - Server helper: `isFeatureEnabled(key)` — 60s in-memory cache, invalidate on update
  - API: `GET /api/feature-flags` (public — enabled flags for client gating)
  - API: `GET/PUT /api/super-admin/feature-flags` (superadmin — list and update)
  - UI: superadmin dashboard toggle panel, grouped by category
  - Seed default flags (push, telegram, email, last seen, snapshots, audit, realtime)

  **Phase 2 — Migrate existing features** (one by one):
  - Telegram notifications → check `notifications.telegram`
  - Push notifications → check `notifications.push`
  - Activity snapshots → check `tracking.activitySnapshots`
  - Audit log snapshots → check `audit.enabled`
  - Last seen tracking → check `tracking.lastSeen` (new feature, depends on this)

  **Phase 3 — Docs & conventions:**
  - AGENTS.md: new optional features must include a feature flag
  - STRUCTURE.md updates

  - Acceptance criteria: Phase 1 shipped, superadmin can toggle features, cache works, disabled features skip logic, no perf regression

- [ ] **Quick task assignment** - Rapidly assign/unassign users to tasks
  - "Assign" button on task cards (kanban hover) and in task detail modal
  - Opens a small popover/dropdown with user search + multi-select
  - Type to filter users by name
  - Click to toggle assignment (optimistic update)
  - Show assigned users with avatar + name, "×" to remove
  - Send notification to newly assigned user
  - Acceptance criteria: Users can quickly assign team members from task card or modal, search works, notifications fire

- [ ] **Task modal redesign** - Better task detail modal with improved UX
  - Redesign layout: cleaner header with task title + status badge, two-column body (details left, activity right)
  - Linked assignee: clickable avatar/name that opens user detail or profile
  - Linked project: clickable project badge
  - Better status/priority selectors (visual, not plain dropdowns)
  - Activity timeline section: shows comments, status changes, assignments in chronological order
  - Keyboard shortcuts: `Esc` to close, `E` to edit, `Delete` to delete
  - Responsive: full-screen on mobile, centered modal on desktop
  - Acceptance criteria: Modal feels polished, all links work, keyboard shortcuts work, responsive layout

- [ ] **API tokens** - Per-user API key authentication for external integrations
  > Full plan: [`TODO/api-tokens.md`](TODO/api-tokens.md)

  Allow all authenticated users to create API tokens that grant the same permissions as their account. Tokens enable integrations with external tools (scripts, CI/CD, bots, third-party apps). Provide API documentation (OpenAPI/Swagger) and exportable Postman collections.

  - DB: `api_tokens` table (userId, name, token hash, prefix, scopes, lastUsedAt, expiresAt, createdAt)
  - Token format: `vellum_<prefix><random>` — prefix is first 8 chars for identification, full token shown only once on creation
  - Auth middleware: check `Authorization: Bearer vellum_...` header, load user + permissions from token
  - API: `GET/POST /api/tokens` — list user's tokens, create new token (returns full token once)
  - API: `DELETE /api/tokens/[id]` — revoke token
  - UI: "API Tokens" section in user settings — create, name, revoke, see last used
  - OpenAPI spec auto-generated from route definitions (Swagger UI at `/api/docs`)
  - Postman collection export endpoint
  - Documentation page explaining auth flow, rate limits, example requests
  - Acceptance criteria: Users can create/revoke tokens, tokens inherit user permissions, Swagger UI works, Postman export available

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