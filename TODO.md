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
  - User management table with last login, IP address, status (active/inactive/banned)
  - Real-time user activity monitoring (logins, actions, failed attempts)
  - Session management (view/revoke active sessions)
  - Enhanced audit logs with filtering by user, action, date range, IP
  - System health metrics (DB connections, API latency, error rates)
  - Role/permission management matrix
  - Export user activity reports (CSV/PDF)
  - Acceptance criteria: Super admin can view all users with last login/IP, monitor activity in real-time, revoke sessions, export audit logs

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