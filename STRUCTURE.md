# Project Structure - Vellum

Detailed directory and file structure with exports, purposes, and key functions.

## Root Level

```
Vellum/
├── .env                    # Environment variables (not committed)
├── .env.example            # Example environment file
├── .gitignore              # Git ignore rules
├── AGENTS.md               # AI agent instructions
├── CONTRIBUTIONS.md        # Contribution guidelines
├── LICENSE                 # MIT License
├── README.md               # Project overview
├── STRUCTURE.md            # This file
├── TODO.md                 # Task tracking
├── bun.lock                # Bun lockfile
├── package.json            # Package scripts & dependencies
├── tsconfig.json           # TypeScript config
├── next.config.ts          # Next.js config
├── eslint.config.mjs       # ESLint config (flat)
├── postcss.config.mjs      # PostCSS config
├── public/                 # Static assets
│   └── sw.js               # Service worker for push notifications
├── drizzle.config.ts       # Drizzle Kit config (TypeScript)
└── drizzle/                # Drizzle migrations (committed)
    ├── 0000_faithful_the_twelve.sql
    └── meta/
        ├── 0000_snapshot.json
        └── _journal.json
```

## Source Code (`src/`)

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css         # Global styles + Tailwind
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home (redirects to login/dashboard)
│   ├── login/
│   │   └── page.tsx        # Login page
│   ├── setup/
│   │   └── page.tsx        # First-time setup page
│   ├── dashboard/
│   │   ├── ClientLayout.tsx   # Dashboard client layout wrapper (QueryProvider + Sidebar)
│   │   ├── layout.tsx      # Dashboard layout (auth + sidebar)
│   │   ├── page.tsx        # Dashboard home
│   │   ├── activity/
│   │   │   └── page.tsx    # Activity log page
│   │   ├── admin/
│   │   │   ├── page.tsx    # Admin page (server)
│   │   │   └── AdminClient.tsx  # Admin client component
│   │   ├── super-admin/
│   │   │   ├── page.tsx              # Super Admin dashboard (server)
│   │   │   ├── SuperAdminClient.tsx  # Tabbed layout with all panels
│   │   │   ├── SuperAdminUsersPanel.tsx      # User management table
│   │   │   ├── SuperAdminActivityPanel.tsx   # Real-time activity feed
│   │   │   ├── SuperAdminSessionsPanel.tsx   # Active sessions table
│   │   │   ├── SuperAdminAuditPanel.tsx      # Filterable audit log table
│   │   │   ├── SuperAdminHealthPanel.tsx     # System health metrics
│   │   │   └── SuperAdminRolesPanel.tsx      # Role / permission matrix
│   │   ├── kanban/
│   │   │   ├── page.tsx              # Global kanban board (server)
│   │   │   └── KanbanBoardClient.tsx # Kanban board with dnd-kit (client)
│   │   ├── projects/
│   │   │   ├── page.tsx                    # Projects list
│   │   │   ├── ProjectListClient.tsx       # Client wrapper
│   │   │   └── [id]/
│   │   │       ├── page.tsx                # Project detail (server)
│   │   │       ├── KanbanBoard.tsx         # Kanban board client
│   │   │       ├── TaskDetailModal.tsx     # Task modal client
│   │   │       └── ProjectManagementPanel.tsx
│   │   ├── tasks/
│   │   │   └── page.tsx    # Tasks page
│   │   └── teams/
│   │       ├── page.tsx              # Teams page
│   │       └── TeamManagementClient.tsx
│   │   └── settings/
│   │       └── page.tsx              # Settings page (notifications)
│   └── api/                # API Routes (REST)
│       ├── auth/
│       │   ├── login/route.ts      # POST - Login
│       │   ├── logout/route.ts     # POST - Logout
│       │   └── me/route.ts         # GET - Current user
│       ├── setup/
│       │   └── route.ts            # GET, POST - Workspace setup
│       ├── users/
│       │   ├── route.ts            # GET, POST - List/Create users
│       │   └── [id]/route.ts       # GET, PATCH, DELETE - User CRUD
│       ├── teams/
│       │   ├── route.ts            # GET, POST - List/Create teams
│       │   ├── [id]/route.ts       # GET, PATCH, DELETE - Team CRUD
│       │   └── [id]/members/route.ts  # GET, POST - Team members
│       ├── projects/
│       │   ├── route.ts            # GET, POST - List/Create projects
│       │   ├── [id]/route.ts       # GET, PATCH, DELETE - Project CRUD
│       │   └── [id]/milestones/route.ts  # GET, POST - Milestones
│       ├── milestones/
│       │   └── [id]/route.ts       # GET, PATCH, DELETE - Milestone CRUD
│       ├── tasks/
│       │   ├── route.ts            # GET, POST - List/Create tasks
│       │   └── [id]/route.ts       # GET, PATCH, DELETE - Task CRUD
│       ├── comments/
│       │   ├── route.ts            # GET, POST - Task comments
│       │   └── [id]/route.ts       # PATCH, DELETE - Comment CRUD
│       ├── activity/
│       │   └── route.ts            # GET - Activity logs
│       ├── stats/
│       │   └── route.ts            # GET - Dashboard statistics
│       ├── health/
│       │   └── route.ts            # GET - Health check
│       ├── push/
│       │   ├── subscribe/route.ts   # POST, DELETE - Push subscriptions
│       │   └── preferences/route.ts # GET, PATCH - Notification preferences
│       └── super-admin/
│           ├── users/route.ts      # GET - List users with last login / IP
│           ├── users/[id]/route.ts # PATCH - Update user role / status
│           ├── activity/route.ts   # GET - Activity feed + 24h stats
│           ├── sessions/route.ts   # GET - Active sessions
│           ├── sessions/[id]/route.ts  # DELETE - Revoke session
│           ├── audit/route.ts      # GET - Filtered audit logs with pagination
│           └── audit/export/route.ts  # GET - CSV export of audit logs
├── components/             # Shared React Components
│   ├── LoginForm.tsx       # Login form (client)
│   ├── PushNotificationToggle.tsx  # UI toggle for browser push notifications
│   ├── RichTextEditor.tsx  # TipTap editor wrapper
│   ├── Sidebar.tsx         # Navigation sidebar (client)
│   └── ui/
│       └── Switch.tsx      # Reusable toggle switch primitive
├── db/                     # Database Layer
│   ├── index.ts            # Drizzle client export
│   ├── schema.ts           # Database schema (tables, enums, relations)
│   ├── seed.ts             # Full demo data seeding
│   └── bootstrap.ts        # Auto-seed on first API call
├── hooks/                  # React Query Hooks
│   ├── useComments.ts      # Comment mutations (create/update/delete) with optimistic updates
│   ├── useMilestones.ts    # Milestone mutations with optimistic updates
│   ├── useProjects.ts      # Project mutations with optimistic updates
│   ├── usePushNotifications.ts     # Service worker registration & push subscriptions
│   ├── useNotificationPreferences.ts  # React Query hooks for notification preferences
│   ├── useRealtime.ts      # Real-time task/comment updates via Pusher
│   ├── useTasks.ts         # Task mutations (CRUD, reorder) with optimistic updates
│   ├── useTeams.ts         # Team mutations with optimistic updates
│   └── useUsers.ts         # User mutations with optimistic updates
├── lib/                    # Utilities
│   ├── api.ts              # API client helpers
│   ├── auth.ts             # Authentication utilities
│   ├── pusher.ts           # Pusher server instance
│   ├── pusher-broadcast.ts # Broadcast task/comment events
│   ├── pusher-channels.ts  # Server-side channel ref counting
│   ├── pusher-client.ts    # Pusher client singleton + ref counting
│   └── push.ts             # Web Push API server utilities (VAPID, send notifications, prefs)
└── providers/              # React Context Providers
    └── QueryProvider.tsx   # React Query + Sonner + Devtools provider
```

## File Details

### `src/app/globals.css`

**Purpose**: Global styles, Tailwind imports, CSS variables for theming
**Exports**: None (CSS file)

### `src/app/layout.tsx`

**Purpose**: Root HTML layout, metadata
**Exports**:

- `metadata` - Page metadata
- `RootLayout({ children })` - Root layout component

### `src/app/page.tsx`

**Purpose**: Home page - redirects to dashboard or login
**Exports**: `HomePage()` - Server component

### `src/app/login/page.tsx`

**Purpose**: Login page with form
**Exports**: `LoginPage()` - Server component

### `src/app/setup/page.tsx`

**Purpose**: First-time workspace setup page
**Exports**: `SetupPage()` - Client component
**Features**:
- Creates initial superadmin user
- Creates first team
- Creates "Getting Started" project
- Redirects to login on success

### `src/app/dashboard/ClientLayout.tsx`

**Purpose**: Dashboard client layout wrapper providing QueryProvider, sidebar, and main content area
**Exports**: `DashboardLayout({ children, user })` - Client component

### `src/app/dashboard/layout.tsx`

**Purpose**: Protected dashboard layout with sidebar
**Exports**: `DashboardLayout({ children })` - Server component

- Validates session via `getSession()`
- Redirects to `/login` if unauthenticated
- Renders `Sidebar` with user info

### `src/app/dashboard/page.tsx`

**Purpose**: Dashboard home page
**Exports**: `DashboardPage()` - Server component

### `src/app/dashboard/kanban/page.tsx`

**Purpose**: Global Kanban board page (cross-project)
**Exports**: `KanbanPage()` - Server component

- Fetches all non-archived projects, all tasks with assignee/project joins, and all users
- Passes serialized data to `KanbanBoardClient`

### `src/app/dashboard/kanban/KanbanBoardClient.tsx`

**Purpose**: Global Kanban board with drag-and-drop (dnd-kit), filtering, and inline task creation
**Exports**: `KanbanBoardClient({ initialColumns, projects, users, currentUserId })` - Client component

**Features**:
- Drag-and-drop task reordering within/between columns (dnd-kit)
- Project filter dropdown
- Search filter
- Inline task creation per column
- Real-time updates via `useRealtime()`
- Opens `TaskDetailModal` on task click

### `src/app/dashboard/activity/page.tsx`

**Purpose**: Activity log page
**Exports**: `ActivityPage()` - Server component

### `src/app/dashboard/admin/page.tsx`

**Purpose**: Admin panel (server)
**Exports**: `AdminPage()` - Server component

- Requires admin/superadmin role

### `src/app/dashboard/admin/AdminClient.tsx`

**Purpose**: Admin client component (user management UI)
**Exports**: `AdminClient()` - Client component

### `src/app/dashboard/super-admin/page.tsx`

**Purpose**: Super Admin dashboard page (server, superadmin-only)
**Exports**: `SuperAdminPage()` - Server component

- Redirects non-superadmins to `/dashboard`

### `src/app/dashboard/super-admin/SuperAdminClient.tsx`

**Purpose**: Super Admin tabbed dashboard layout
**Exports**: `SuperAdminClient()` - Client component

- Tabs: Users, Live Activity, Sessions, Audit Logs, System Health, Role Matrix
- Renders appropriate panel component per active tab

### `src/app/dashboard/super-admin/SuperAdminUsersPanel.tsx`

**Purpose**: Full user directory with search, filters, inline role/status editing
**Exports**: `SuperAdminUsersPanel()` - Client component

- Search by name/email, role/status filters
- Sort by name, createdAt, lastLoginAt
- Displays last login time and IP per user (from `user_sessions`)
- Inline role/status dropdowns with optimistic updates

### `src/app/dashboard/super-admin/SuperAdminActivityPanel.tsx`

**Purpose**: Real-time activity monitoring feed
**Exports**: `SuperAdminActivityPanel()` - Client component

- Polls every 5 seconds for live updates
- Shows 24h mini stats: logins, failed attempts, active users
- Unified feed of user actions + login attempts with IP addresses

### `src/app/dashboard/super-admin/SuperAdminSessionsPanel.tsx`

**Purpose**: Active session management
**Exports**: `SuperAdminSessionsPanel()` - Client component

- Polls every 10 seconds
- Lists all active sessions with user, role, IP, start time, expiry
- Revoke button per session (self-protection: cannot revoke own session)

### `src/app/dashboard/super-admin/SuperAdminAuditPanel.tsx`

**Purpose**: Filterable audit log viewer with CSV export
**Exports**: `SuperAdminAuditPanel()` - Client component

- Filters: user ID, action, IP, date range
- Paginated table (25 per page)
- Export CSV button that downloads filtered results

### `src/app/dashboard/super-admin/SuperAdminHealthPanel.tsx`

**Purpose**: System health metrics dashboard
**Exports**: `SuperAdminHealthPanel()` - Client component

- Polls every 30 seconds
- Stat cards: active sessions, total users, tasks, projects
- User status breakdown (active/inactive/banned)
- 24h activity summary: activities, failed logins, total teams
- Top actions breakdown by count

### `src/app/dashboard/super-admin/SuperAdminRolesPanel.tsx`

**Purpose**: Role and permission matrix viewer
**Exports**: `SuperAdminRolesPanel()` - Client component

- Role cards: superadmin, admin, member with descriptions
- Permission matrix table grouped by category
- Toggle highlighting a role's column
- Check/X icons for granted/denied permissions

### `src/app/dashboard/projects/page.tsx`

**Purpose**: Projects list page
**Exports**: `ProjectsPage()` - Server component

- Fetches projects via API

### `src/app/dashboard/projects/ProjectListClient.tsx`

**Purpose**: Client wrapper for projects list (create modal, etc.)
**Exports**: `ProjectListClient({ projects })` - Client component

### `src/app/dashboard/projects/[id]/page.tsx`

**Purpose**: Project detail page (server)
**Exports**: `ProjectPage({ params })` - Server component

- Fetches project, tasks, members

### `src/app/dashboard/projects/[id]/KanbanBoard.tsx`

**Purpose**: Kanban board with columns (Backlog, Todo, In Progress, Review, Done)
**Exports**: `KanbanBoard({ projectId, initialColumns, users, allProjects, currentUserId })` - Client component

- Drag-and-drop (dnd-kit)
- Task cards with priority, assignee, due date
- Inline task creation with Project dropdown

### `src/app/dashboard/projects/[id]/TaskDetailModal.tsx`

**Purpose**: Modal for task details (description, comments, activity)
**Exports**: `TaskDetailModal({ task, users, currentUserId, onClose, onChange })` - Client component

- Rich text editor for description
- Inline task editing (title, status, priority, assignee, due date)
- Comments section with CRUD
- Real-time comment updates via `useRealtime()`
- Task delete confirmation

### `src/app/dashboard/projects/[id]/ProjectManagementPanel.tsx`

**Purpose**: Project settings panel (edit, archive, delete, members)
**Exports**: `ProjectManagementPanel({ project })` - Client component

### `src/app/dashboard/tasks/page.tsx`

**Purpose**: All tasks view (cross-project)
**Exports**: `TasksPage()` - Server component

### `src/app/dashboard/teams/page.tsx`

**Purpose**: Teams management page
**Exports**: `TeamsPage()` - Server component

### `src/app/dashboard/teams/TeamManagementClient.tsx`

**Purpose**: Client component for team CRUD
**Exports**: `TeamManagementClient({ teams, users })` - Client component

### `src/app/dashboard/settings/page.tsx`

**Purpose**: Settings page with notification preferences
**Exports**: `SettingsPage()` - Server component
**Features**:
- Renders `PushNotificationToggle` for browser push notification management
- Displays and manages per-event notification preferences via `useNotificationPreferences`

---

### API Routes

#### `src/app/api/setup/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: First-time workspace setup
**GET**: Returns `{ initialized: boolean }`
**POST Request**: `{ name, email, password, teamName }`
**POST Response**: `{ success: true, userId }` or `{ error: string }`
**Functions**:

- `GET()` - Checks if workspace is initialized
- `POST(req)` - Creates superadmin user, team, and initial project

#### `src/app/api/auth/login/route.ts`

**Methods**: `POST`
**Purpose**: User authentication
**Request**: `{ email, password }` (JSON or form)
**Response**: `{ user }` + session cookie
**Functions**:

- `POST(req)` - Handles login, creates session, sets cookie

#### `src/app/api/auth/logout/route.ts`

**Methods**: `POST`
**Purpose**: Destroy session
**Response**: Clear session cookie
**Functions**:

- `POST()` - Deletes session, clears cookie

#### `src/app/api/auth/me/route.ts`

**Methods**: `GET`
**Purpose**: Get current authenticated user
**Response**: `{ user }` or `{ user: null }`
**Functions**:

- `GET()` - Returns session user

#### `src/app/api/users/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: List users / Create user (admin)
**Functions**:

- `GET()` - Returns all users
- `POST(req)` - Creates new user

#### `src/app/api/users/[id]/route.ts`

**Methods**: `GET`, `PATCH`, `DELETE`
**Purpose**: User CRUD
**Functions**:

- `GET(req, { params })` - Get user by ID
- `PATCH(req, { params })` - Update user
- `DELETE(req, { params })` - Delete user

#### `src/app/api/teams/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: List/Create teams
**Functions**:

- `GET()` - List teams
- `POST(req)` - Create team

#### `src/app/api/teams/[id]/route.ts`

**Methods**: `GET`, `PATCH`, `DELETE`
**Purpose**: Team CRUD
**Functions**:

- `GET(req, { params })` - Get team
- `PATCH(req, { params })` - Update team
- `DELETE(req, { params })` - Delete team

#### `src/app/api/teams/[id]/members/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: Team members management
**Functions**:

- `GET(req, { params })` - List team members
- `POST(req, { params })` - Add member to team

#### `src/app/api/projects/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: List/Create projects
**Functions**:

- `GET(req)` - List projects (query: `archived`)
- `POST(req)` - Create project

#### `src/app/api/projects/[id]/route.ts`

**Methods**: `GET`, `PATCH`, `DELETE`
**Purpose**: Project CRUD
**Functions**:

- `GET(req, { params })` - Get project
- `PATCH(req, { params })` - Update project
- `DELETE(req, { params })` - Delete project

#### `src/app/api/projects/[id]/milestones/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: Project milestones
**Functions**:

- `GET(req, { params })` - List milestones
- `POST(req, { params })` - Create milestone

#### `src/app/api/milestones/[id]/route.ts`

**Methods**: `GET`, `PATCH`, `DELETE`
**Purpose**: Milestone CRUD
**Functions**:

- `GET(req, { params })` - Get milestone
- `PATCH(req, { params })` - Update milestone
- `DELETE(req, { params })` - Delete milestone

#### `src/app/api/tasks/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: List/Create tasks
**Functions**:

- `GET(req)` - List tasks (filters: `projectId`, `status`, `assigneeId`)
- `POST(req)` - Create task

#### `src/app/api/tasks/[id]/route.ts`

**Methods**: `GET`, `PATCH`, `DELETE`
**Purpose**: Task CRUD
**Functions**:

- `GET(req, { params })` - Get task
- `PATCH(req, { params })` - Update task
- `DELETE(req, { params })` - Delete task

#### `src/app/api/comments/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: Task comments
**Functions**:

- `GET(req)` - List comments (query: `taskId`)
- `POST(req)` - Create comment

#### `src/app/api/activity/route.ts`

**Methods**: `GET`
**Purpose**: Activity logs
**Functions**:

- `GET(req)` - List activity (pagination, filters)

#### `src/app/api/stats/route.ts`

**Methods**: `GET`
**Purpose**: Dashboard statistics
**Functions**:

- `GET()` - Returns stats (counts, velocities, etc.)

#### `src/app/api/health/route.ts`

**Methods**: `GET`
**Purpose**: Health check endpoint
**Functions**:

- `GET()` - Returns `{ status: "ok" }`

#### `src/app/api/push/subscribe/route.ts`

**Methods**: `POST`, `DELETE`
**Purpose**: Manage push subscriptions (Web Push)
**Functions**:

- `POST(req)` - Stores a new push subscription (endpoint, keys, user agent)
- `DELETE(req)` - Removes the current user's push subscription

#### `src/app/api/push/preferences/route.ts`

**Methods**: `GET`, `PATCH`
**Purpose**: Manage per-user notification preferences
**Functions**:

- `GET()` - Returns the current user's notification preference settings
- `PATCH(req)` - Updates specific event-type preferences (enabled/disabled)

#### `src/app/api/super-admin/users/route.ts`

**Methods**: `GET`
**Purpose**: List all users enriched with last login data
**Functions**:

- `GET()` - Returns `{ users }` with `lastLoginAt` and `lastIp` from `user_sessions`
- Gated behind `superadmin` role check

#### `src/app/api/super-admin/users/[id]/route.ts`

**Methods**: `PATCH`
**Purpose**: Update user role/status (superadmin-only)
**Functions**:

- `PATCH(req, { params })` - Updates name, email, role, status, or password
- Self-protection: cannot change own role/status

#### `src/app/api/super-admin/activity/route.ts`

**Methods**: `GET`
**Purpose**: Unified activity feed for super admin dashboard
**Functions**:

- `GET()` - Returns merged feed of `activityLogs` + `userSessions` + 24h stats

#### `src/app/api/super-admin/sessions/route.ts`

**Methods**: `GET`
**Purpose**: List all active (non-expired) sessions
**Functions**:

- `GET()` - Returns `{ sessions }` with user info and IP addresses

#### `src/app/api/super-admin/sessions/[id]/route.ts`

**Methods**: `DELETE`
**Purpose**: Revoke a session
**Functions**:

- `DELETE(req, { params })` - Deletes session by ID
- Self-protection: cannot delete own session

#### `src/app/api/super-admin/audit/route.ts`

**Methods**: `GET`
**Purpose**: Filterable audit logs with pagination
**Functions**:

- `GET(req)` - Returns `{ logs, page, pageSize, total, totalPages }`
- Query params: `userId`, `action`, `ip`, `from`, `to`, `page`, `pageSize`

#### `src/app/api/super-admin/audit/export/route.ts`

**Methods**: `GET`
**Purpose**: CSV export of filtered audit logs
**Functions**:

- `GET(req)` - Returns CSV download with headers and all matching rows
- Query params: `userId`, `action`, `ip`, `from`, `to`

#### `src/app/api/super-admin/health/route.ts`

**Methods**: `GET`
**Purpose**: System health metrics overview
**Functions**:

- `GET()` - Returns `{ activeSessions, totalUsers, userStatusBreakdown, activity24h, failedLogins24h, totalTasks, totalProjects, totalTeams, actionBreakdown }`

#### `src/app/api/super-admin/permissions/route.ts`

**Methods**: `GET`
**Purpose**: Role and permission matrix data
**Functions**:

- `GET()` - Returns `{ roles, permissions, rolePermissions }`

---

### Components

#### `src/components/LoginForm.tsx`

**Purpose**: Login form with email/password
**Exports**: `LoginForm()` - Client component
**Props**: None (uses `useRouter`, `useState`)
**Features**: Form validation, error display, loading state

#### `src/components/RichTextEditor.tsx`

**Purpose**: TipTap-based rich text editor
**Exports**: `RichTextEditor({ content, onChange, placeholder })` - Client component
**Dependencies**: `@tiptap/react`, `@tiptap/starter-kit`

#### `src/components/Sidebar.tsx`

**Purpose**: Collapsible navigation sidebar
**Exports**: `Sidebar({ user })` - Client component
**Props**: `user: AuthUser`
**Features**:

- Collapsible (icon-only mode)
- Navigation links (Dashboard, Projects, Tasks, Teams, Activity, Admin)
- Role-based Admin link (superadmin/admin only)
- User avatar with initials, role badge
- Logout button

#### `src/components/PushNotificationToggle.tsx`

**Purpose**: UI toggle to enable/disable browser push notifications
**Exports**: `PushNotificationToggle()` - Client component
**Features**:
- Uses `usePushNotifications` hook to manage service worker registration
- Shows browser permission state and subscription status
- Displays toast feedback for permission errors

#### `src/components/ui/Switch.tsx`

**Purpose**: Reusable toggle switch primitive (Radix UI)
**Exports**: `Switch({ checked, onCheckedChange, disabled, ... })` - Client component
**Dependencies**: `@radix-ui/react-switch`

---

### Database (`src/db/`)

#### `src/db/index.ts`

**Purpose**: Drizzle client singleton
**Exports**:

- `db` - Drizzle database instance
- `pool` - pg Pool instance
  **Pattern**: Global singleton for connection pooling in dev

#### `src/db/schema.ts`

**Purpose**: Complete database schema definition
**Exports** (Tables):

- `users` - User accounts
- `teams` - Teams
- `teamMembers` - Team membership
- `projects` - Projects
- `projectMilestones` - Project milestones
- `projectNotes` - Project notes
- `tasks` - Kanban tasks
- `comments` - Task comments
- `sessions` - Auth sessions
- `activityLogs` - Activity audit trail

**Exports** (Enums):

- `userRoleEnum` - `superadmin` | `admin` | `member`
- `taskStatusEnum` - `backlog` | `todo` | `in_progress` | `review` | `done`
- `taskPriorityEnum` - `low` | `medium` | `high` | `urgent`

**Relations**: Defined via Drizzle `references()` and foreign keys

#### `src/db/seed.ts`

**Purpose**: Full demo data seeding (run manually)
**Exports**: None (self-executing)
**Functions**:

- `seed()` - Main seeding function
- Creates: 8 users, 4 teams, 6 projects, 30+ tasks, comments, activity logs
- Logs demo credentials to console

#### `src/db/bootstrap.ts`

**Purpose**: Auto-seed minimal demo data on first API call
**Exports**: `ensureDemoData()` - Returns Promise
**Pattern**: Singleton promise - only runs once
**Data**: 5 users, 3 teams, 3 projects, 8 tasks, comments, activity logs

---

### Hooks (`src/hooks/`)

#### `src/hooks/useComments.ts`

**Purpose**: React Query mutations for comment operations with optimistic updates
**Exports**:
- `useCreateComment()` - Create comment with optimistic UI update
- `useUpdateComment()` - Update comment with optimistic UI update
- `useDeleteComment()` - Delete comment with optimistic UI update

**Pattern**: All hooks use `useMutation` with `onMutate` for optimistic updates, `onError` for rollback with toast, `onSettled` for cache invalidation

#### `src/hooks/useTasks.ts`

**Purpose**: React Query mutations for task operations with optimistic updates
**Exports**:
- `useCreateTask()` - Create task
- `useUpdateTask()` - Update task
- `useDeleteTask()` - Delete task
- `useReorderTasks()` - Reorder tasks within/between columns

#### `src/hooks/useProjects.ts`

**Purpose**: React Query mutations for project operations
**Exports**:
- `useCreateProject()` - Create project
- `useUpdateProject()` - Update project
- `useDeleteProject()` - Delete project

#### `src/hooks/useTeams.ts`

**Purpose**: React Query mutations for team operations
**Exports**:
- `useCreateTeam()` - Create team
- `useUpdateTeam()` - Update team
- `useDeleteTeam()` - Delete team
- `useAddTeamMember()` - Add member to team
- `useRemoveTeamMember()` - Remove member from team
- `useUpdateTeamMemberRole()` - Update member role

#### `src/hooks/useUsers.ts`

**Purpose**: React Query mutations for user management
**Exports**:
- `useCreateUser()` - Create user (admin)
- `useUpdateUser()` - Update user
- `useDeleteUser()` - Delete user

#### `src/hooks/useRealtime.ts`

**Purpose**: Real-time task and comment updates via Pusher
**Exports**:
- `useRealtime(projectId?, taskId?)` - Subscribe to live updates

**Behavior**:
- Subscribes to `project-${projectId}` and `task-updates` channels for task events
- Subscribes to `task-${taskId}` channel for comment events
- Invalidates relevant React Query caches on incoming events
- Shows toast notifications for updates from other users (skips self)

#### `src/hooks/useMilestones.ts`

**Purpose**: React Query mutations for milestone operations
**Exports**:
- `useCreateMilestone()` - Create milestone
- `useUpdateMilestone()` - Update milestone
- `useDeleteMilestone()` - Delete milestone

#### `src/hooks/usePushNotifications.ts`

**Purpose**: Manages service worker registration and push subscriptions
**Exports**:
- `usePushNotifications()` - Returns `{ subscription, isSupported, subscribe, unsubscribe, permission }`

**Behavior**:
- Registers `/sw.js` service worker
- Handles VAPID key retrieval from server
- Provides `subscribe()` to create push subscription
- Provides `unsubscribe()` to remove subscription
- Tracks browser permission state

#### `src/hooks/useNotificationPreferences.ts`

**Purpose**: React Query hooks for fetching/updating notification preferences
**Exports**:
- `useNotificationPreferences()` - Query hook returning user preferences
- `useUpdateNotificationPreferences()` - Mutation hook for updating preferences

**Pattern**: Standard React Query with cache invalidation on mutation success

---

### Providers (`src/providers/`)

#### `src/providers/QueryProvider.tsx`

**Purpose**: React Query client provider with Sonner and Devtools
**Exports**: `QueryProvider({ children })` - Client component

**Config**:
- Default stale time: 5 minutes
- Retry: 1 for queries, 0 for mutations
- Refetch on window focus: false
- Includes `<Toaster position="top-right" theme="dark" />`
- Includes `<ReactQueryDevtools initialIsOpen={false} />`

---

### Lib (`src/lib/`)

#### `src/lib/auth.ts`

**Purpose**: Authentication utilities
**Exports**:

- `AuthUser` - Type for authenticated user
- `getSession(): Promise<AuthUser | null>` - Get current session
- `createSession(userId): Promise<string>` - Create new session
- `destroySession(sessionId)` - Delete session
- `authenticateUser(email, password): Promise<AuthResult>` - Verify credentials, returns `{ ok, user }` or `{ ok: false, reason }` with reasons: `invalid_credentials`, `inactive`, `banned`
- `requireAuth(user)` - Assert user exists (throws)
- `requireRole(user, roles)` - Assert user has role (throws)
- `SESSION_COOKIE` - Cookie name constant
- `SESSION_MAX_AGE` - Session duration (7 days)

#### `src/lib/api.ts`

**Purpose**: API client helpers
**Exports**:

- `apiFetch(input, init?)` - Wrapper around fetch with auth
- `getJSON(url)` - GET with JSON parsing
- `postJSON(url, data)` - POST with JSON

#### `src/lib/audit.ts`

**Purpose**: Request metadata extraction for audit logging
**Exports**:

- `getClientIP(req: NextRequest): string` - Extracts IP from `x-forwarded-for`, `x-real-ip`, or returns `"unknown"`

#### `src/lib/pusher.ts`

**Purpose**: Pusher server-side instance
**Exports**: `pusher` - Configured Pusher server instance

#### `src/lib/pusher-broadcast.ts`

**Purpose**: Broadcast task and comment events to Pusher channels
**Exports**:
- `broadcastTaskEvent(projectId, payload)` - Broadcast task changes to `project-${projectId}` and `task-updates`
- `broadcastCommentEvent(taskId, payload)` - Broadcast comment changes to `task-${taskId}`

#### `src/lib/pusher-channels.ts`

**Purpose**: Server-side channel subscription reference counting (side-effects module)
**Exports**:
- `subscribeChannel(name)` - Increment ref count and subscribe
- `unsubscribeChannel(name)` - Decrement ref count and unsubscribe when 0

#### `src/lib/pusher-client.ts`

**Purpose**: Pusher client singleton and channel ref counting for browser
**Exports**:
- `getPusherClient()` - Returns shared Pusher-js instance
- `subscribeChannel(name)` - Client-side subscribe with ref counting
- `unsubscribeChannel(name)` - Client-side unsubscribe with ref counting

#### `src/lib/push.ts`

**Purpose**: Web Push API server utilities
**Exports**:
- `webPush` - Configured `web-push` instance with VAPID keys
- `sendPushNotification(subscription, payload)` - Sends push notification to a subscription
- `getVapidPublicKey()` - Returns VAPID public key for client
- `getUserPushSubscription(userId)` - Retrieves active subscription for a user
- `savePushSubscription(userId, subscription)` - Stores subscription in DB
- `deletePushSubscription(userId)` - Removes subscription from DB
- `getNotificationPreferences(userId)` - Gets per-event preferences
- `updateNotificationPreferences(userId, preferences)` - Updates preferences
- `shouldNotify(userId, eventType)` - Checks if a user should receive a notification for an event

---

## Configuration Files

### `package.json`

**Key Scripts**:

- `dev` - `next dev` (Turbopack)
- `build` - `next build`
- `start` - `next start`
- `lint` - `eslint .`
- `typecheck` - `tsc --noEmit`
- `db:generate` - `dotenv -e .env -- drizzle-kit generate`
- `db:migrate` - `dotenv -e .env -- drizzle-kit migrate`
- `db:push` - `dotenv -e .env -- drizzle-kit push`
- `db:studio` - `dotenv -e .env -- drizzle-kit studio`
- `db:seed` - `dotenv -e .env -- tsx src/db/seed.ts`
- `vercel:build` - `bun run db:generate && next build`
- `vercel:deploy` - `bun run db:migrate && vercel --prod`

### `drizzle.config.ts`

**Purpose**: Drizzle Kit configuration
**Exports**: Default config object

- `dialect: "postgresql"`
- `schema: "./src/db/schema.ts"`
- `out: "./drizzle"`
- `dbCredentials.url` - From `DIRECT_DATABASE_URL` env var

### `tsconfig.json`

**Purpose**: TypeScript configuration

- `target: "ES2017"`
- `module: "ESNext"`
- `moduleResolution: "bundler"`
- `strict: true`
- `paths: { "@/*": ["./src/*"] }`
- `plugins: [{ name: "next" }]`

### `next.config.ts`

**Purpose**: Next.js configuration

- Minimal config (defaults work)

### `eslint.config.mjs`

**Purpose**: ESLint flat config

- Extends `next/core-web-vitals`
- TypeScript support

### `postcss.config.mjs`

**Purpose**: PostCSS config for Tailwind CSS v4

- `@tailwindcss/postcss` plugin

---

## Data Flow Summary

```
Browser Request
    │
    ▼
Next.js App Router (Server Component)
    │
    ├── getSession() ──────► cookies() ──────► session cookie
    │                           │
    │                           ▼
    │                    sessions table (DB)
    │                           │
    │                           ▼
    │                    users table (DB)
    │                           │
    │                           ▼
    │                    Returns AuthUser
    │
    ├── API Route (if data mutation)
    │     │
    │     ├── getSession() ──► Auth check
    │     │
    │     ├── db.query() ──────► PostgreSQL (Neon)
    │     │
    │     └── Returns JSON
    │
    └── Renders UI (with client components for interactivity)
```

---

## Key Patterns

1. **Server-First**: Default to Server Components, use `"use client"` only when needed
2. **Auth in Layout**: `dashboard/layout.tsx` checks session, redirects to login
3. **API Consistency**: All routes return `{ data }` or `{ error }` with proper status codes
4. **Database**: Drizzle ORM with `db` singleton, pg Pool for connections
5. **Seeding**: `bootstrap.ts` auto-seeds on first API call; `seed.ts` for full demo data
6. **Types**: Shared `AuthUser` type from `lib/auth.ts` used across components
