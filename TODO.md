# TODO - Vellum Project Tasks

## Priority: High

- [ ] **Optimistic updates everywhere** - Implement optimistic UI updates across all mutations
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

- [ ] **Real-time updates** - Add WebSocket/SSE for live task updates across clients
  - Use Pusher, Ably, or native WebSockets with `ws` library
  - Update Kanban board in real-time when tasks change
  - Broadcast task moves, status changes, new comments

- [x] **Drag-and-drop Kanban** - Implement task reordering with @dnd-kit
  - Drag tasks between columns (status changes)
  - Drag tasks within column (position changes)
  - Persist position changes to database
  - Optimistic UI updates

- [ ] **Task comments** - Full comment system on tasks
  - API routes partially exist (`/api/comments`)
  - Display in TaskDetailModal
  - Real-time comment notifications
  - @mention support

- [ ] **File attachments** - Allow file uploads on tasks/projects
  - Integrate with S3/R2/Cloudinary
  - Add `attachments` table to schema
  - Display in UI with previews

## Priority: Medium

- [ ] **Email notifications** - Send emails for assignments, mentions, due dates
  - Integrate Resend or SendGrid
  - Notification preferences per user
  - Template system for emails

- [ ] **Project milestones** - Full milestone tracking UI
  - API routes exist (`/api/projects/[id]/milestones`, `/api/milestones/[id]`)
  - Timeline/Gantt view
  - Milestone progress tracking

- [ ] **Team management UI** - Complete team CRUD and member management
  - Invite members via email
  - Role management (lead, contributor, viewer)
  - Team settings page

- [ ] **Bug: Admin user creation not reflected in UI** - Fix missing UI update and loading state
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
