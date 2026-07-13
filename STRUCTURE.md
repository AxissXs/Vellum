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
├── deno.json               # Deno task definitions (replaces npm/bun scripts)
├── deno.lock               # Deno lockfile (generated)
├── package.json            # Package dependencies (no scripts - see deno.json)
├── tsconfig.json           # TypeScript config
├── next.config.ts          # Next.js config
├── eslint.config.mjs       # ESLint config (flat)
├── postcss.config.mjs      # PostCSS config
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
│   │   ├── kanban/
│   │   │   ├── page.tsx              # Global kanban board (server)
│   │   │   └── KanbanBoardClient.tsx # Kanban board with dnd-kit (client)
│   │   ├── projects/
│   │   │   ├── page.tsx                    # Projects list
│   │   │   ├── ProjectListClient.tsx       # Client wrapper
│   │   │   └── [id]/
│   │   │       ├── page.tsx                # Project detail (server)
│   │   │       ├── ProjectNav.tsx          # Board / Backlog tabs
│   │   │       ├── KanbanBoard.tsx         # Kanban board client
│   │   │       ├── TaskDetailModal.tsx     # Task modal client
│   │   │       ├── ProjectManagementPanel.tsx
│   │   │       └── backlog/
│   │   │           ├── page.tsx            # Project backlog (server)
│   │   │           └── ProjectBacklogClient.tsx  # Backlog list + assign to sprint
│   │   ├── tasks/
│   │   │   └── page.tsx    # Tasks page
│   │   ├── sprints/
│   │   │   ├── page.tsx                    # Sprints list (server)
│   │   │   ├── SprintsClient.tsx           # Sprint list + create (client)
│   │   │   └── [id]/
│   │   │       ├── page.tsx                # Sprint detail (server)
│   │   │       └── SprintDetailClient.tsx  # Tabs: KanbanBoard (shared), burndown, planning, standup, retro
│   │   └── teams/
│   │       ├── page.tsx              # Teams page
│   │       └── TeamManagementClient.tsx
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
│       ├── sprints/
│       │   ├── route.ts            # GET, POST - List/Create sprints
│       │   └── [id]/
│       │       ├── route.ts        # GET, PATCH, DELETE - Sprint CRUD
│       │       └── burndown/route.ts  # GET - Burndown chart data
│       ├── standups/
│       │   └── route.ts            # GET, POST - List/Upsert standups
│       ├── retros/
│       │   ├── route.ts            # GET, POST - List/Create retro items
│       │   └── [id]/route.ts       # PATCH, DELETE - Retro item CRUD
│       ├── comments/
│       │   ├── route.ts            # GET, POST - Task comments
│       │   └── [id]/route.ts       # PATCH, DELETE - Comment CRUD
│       ├── activity/
│       │   └── route.ts            # GET - Activity logs
│       ├── stats/
│       │   └── route.ts            # GET - Dashboard statistics
│       └── health/
│           └── route.ts            # GET - Health check
├── components/             # Shared React Components
│   ├── LoginForm.tsx       # Login form (client)
│   ├── RichTextEditor.tsx  # TipTap editor wrapper
│   └── Sidebar.tsx         # Navigation sidebar (client)
├── db/                     # Database Layer
│   ├── index.ts            # Drizzle client export
│   ├── schema.ts           # Database schema (tables, enums, relations)
│   ├── seed.ts             # Full demo data seeding
│   └── bootstrap.ts        # Auto-seed on first API call
├── hooks/                  # React Query Hooks
│   ├── useComments.ts      # Comment mutations (create/update/delete) with optimistic updates
│   ├── useMilestones.ts    # Milestone mutations with optimistic updates
│   ├── useProjects.ts      # Project mutations with optimistic updates
│   ├── useRealtime.ts      # Real-time task/comment updates via Pusher
│   ├── useRetros.ts        # Retro item mutations with optimistic updates
│   ├── useSprints.ts       # Sprint mutations with optimistic updates
│   ├── useStandups.ts      # Standup queries and upsert mutations
│   ├── useTasks.ts         # Task mutations (CRUD, reorder) with optimistic updates
│   ├── useTeams.ts         # Team mutations with optimistic updates
│   └── useUsers.ts         # User mutations with optimistic updates
├── lib/                    # Utilities
│   ├── api.ts              # API client helpers
│   ├── auth.ts             # Authentication utilities
│   ├── pusher.ts           # Pusher server instance
│   ├── pusher-broadcast.ts # Broadcast task/comment events
│   ├── pusher-channels.ts  # Server-side channel ref counting
│   └── pusher-client.ts    # Pusher client singleton + ref counting
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

**Purpose**: Shared Kanban board with columns (Backlog, Todo, In Progress, Review, Done). Used on project board and sprint Board tab.
**Exports**: `KanbanBoard({ projectId, initialColumns, users, allProjects, currentUserId, sprintId? })` - Client component

**Features**:
- Drag-and-drop reordering within/between columns (dnd-kit)
- Task cards with priority, assignee, due date
- Inline task creation per column
- Opens `TaskDetailModal` on task click
- Optional `sprintId`: new tasks auto-linked to sprint; project picker hidden in sprint context

**Used by**:
- `src/app/dashboard/projects/[id]/page.tsx` — full project board
- `src/app/dashboard/sprints/[id]/SprintDetailClient.tsx` — sprint Board tab (sprint-scoped tasks only)

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

### `src/app/dashboard/projects/[id]/ProjectNav.tsx`

**Purpose**: Sub-navigation tabs on project pages
**Exports**: `ProjectNav({ projectId })` - Client component
**Features**: Board | Backlog tab links

### `src/app/dashboard/projects/[id]/backlog/page.tsx`

**Purpose**: Project backlog page (server)
**Exports**: `ProjectBacklogPage({ params })` - Server component
**Features**: Fetches tasks where `sprintId IS NULL` for the project

### `src/app/dashboard/projects/[id]/backlog/ProjectBacklogClient.tsx`

**Purpose**: Backlog list UI with sprint assignment
**Exports**: `ProjectBacklogClient({ projectId, initialTasks, sprints })` - Client component
**Features**:
- List unassigned backlog tasks (`sprintId = null`)
- Create new backlog tasks
- Assign tasks to a sprint via Planning-style dropdown

### `src/app/dashboard/sprints/page.tsx`

**Purpose**: Sprints list page (server)
**Exports**: `SprintsPage()` - Server component

### `src/app/dashboard/sprints/SprintsClient.tsx`

**Purpose**: Sprint list with create modal
**Exports**: `SprintsClient({ projects, currentUserId })` - Client component

### `src/app/dashboard/sprints/[id]/page.tsx`

**Purpose**: Sprint detail page (server)
**Exports**: `SprintDetailPage({ params })` - Server component
**Features**: Fetches sprint, sprint tasks, project backlog tasks, users, and projects for `KanbanBoard`

### `src/app/dashboard/sprints/[id]/SprintDetailClient.tsx`

**Purpose**: Sprint workspace with tabbed agile tools
**Exports**: `SprintDetailClient({ sprint, project, tasks, backlogTasks, users, allProjects, currentUserId })` - Client component
**Tabs**:
- **Board** — reuses `KanbanBoard` from project module (`sprintId` prop); same drag-and-drop, task modal, inline create as project board
- **Burndown** — recharts line chart from `/api/sprints/[id]/burndown`
- **Planning** — pull backlog tasks into sprint or remove back to backlog
- **Standup** — daily standup form/list
- **Retro** — went well / improve / action items
**Features**: Complete Sprint button (rolls unfinished tasks to backlog via API)

### `src/app/dashboard/tasks/page.tsx`

**Purpose**: All tasks view (cross-project)
**Exports**: `TasksPage()` - Server component

### `src/app/dashboard/teams/page.tsx`

**Purpose**: Teams management page
**Exports**: `TeamsPage()` - Server component

### `src/app/dashboard/teams/TeamManagementClient.tsx`

**Purpose**: Client component for team CRUD
**Exports**: `TeamManagementClient({ teams, users })` - Client component

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

#### `src/app/api/sprints/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: List/Create sprints (filter by `?projectId`)
**Functions**:

- `GET(req)` - List sprints for a project
- `POST(req)` - Create sprint

#### `src/app/api/sprints/[id]/route.ts`

**Methods**: `GET`, `PATCH`, `DELETE`
**Purpose**: Sprint CRUD; activating a sprint deactivates others in the project; completing a sprint rolls unfinished tasks to backlog
**Functions**:

- `GET(req, { params })` - Get sprint
- `PATCH(req, { params })` - Update sprint; when `status` → `completed`, sets `sprintId = null` on tasks where `status !== "done"`
- `DELETE(req, { params })` - Delete sprint

#### `src/app/api/sprints/[id]/burndown/route.ts`

**Methods**: `GET`
**Purpose**: Burndown chart data (ideal vs actual remaining story points)
**Functions**:

- `GET(req, { params })` - Returns `{ totalPoints, ideal, actual }` per day

#### `src/app/api/standups/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: List standups (filter by `?userId`, `?sprintId`, `?date`) / upsert daily standup
**Functions**:

- `GET(req)` - List standups
- `POST(req)` - Create or update today's standup for user

#### `src/app/api/retros/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: List/Create retro items (filter by `?sprintId`)
**Functions**:

- `GET(req)` - List retro items
- `POST(req)` - Create retro item

#### `src/app/api/retros/[id]/route.ts`

**Methods**: `PATCH`, `DELETE`
**Purpose**: Retro item CRUD
**Functions**:

- `PATCH(req, { params })` - Update retro item
- `DELETE(req, { params })` - Delete retro item

#### `src/app/api/tasks/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: List/Create tasks
**Functions**:

- `GET(req)` - List tasks (filters: `projectId`, `status`, `assigneeId`, `sprintId`)
- `POST(req)` - Create task (optional `sprintId`, `estimate`)

#### `src/app/api/tasks/[id]/route.ts`

**Methods**: `GET`, `PATCH`, `DELETE`
**Purpose**: Task CRUD; records status history for burndown when status changes
**Functions**:

- `GET(req, { params })` - Get task
- `PATCH(req, { params })` - Update task (including `sprintId`, `estimate`)
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
- Navigation links (Dashboard, Projects, Tasks, Teams, Sprints, Activity, Admin)
- Role-based Admin link (superadmin/admin only)
- User avatar with initials, role badge
- Logout button

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
- `tasks` - Kanban tasks (includes `sprintId`, `estimate`)
- `sprints` - Time-boxed sprints per project
- `standups` - Daily standup entries per user
- `retroItems` - Sprint retrospective items
- `taskStatusHistory` - Task status change history (burndown)
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

#### `src/hooks/useSprints.ts`

**Purpose**: React Query mutations for sprint operations with optimistic updates
**Exports**:
- `useCreateSprint()` - Create sprint
- `useUpdateSprint()` - Update sprint (including set active)
- `useDeleteSprint()` - Delete sprint

#### `src/hooks/useStandups.ts`

**Purpose**: React Query queries and mutations for daily standups
**Exports**:
- `useStandups(params)` - Fetch standups by user/sprint/date
- `useCreateStandup()` - Upsert daily standup

#### `src/hooks/useRetros.ts`

**Purpose**: React Query queries and mutations for sprint retro items
**Exports**:
- `useRetros(sprintId)` - Fetch retro items for a sprint
- `useCreateRetroItem()` - Add retro item
- `useDeleteRetroItem()` - Delete retro item

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
- `authenticateUser(email, password): Promise<AuthUser | null>` - Verify credentials
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

---

## Configuration Files

### `package.json`

Holds `dependencies`/`devDependencies` only (Deno reads these for `deno install`). No `scripts` block — execution is defined in `deno.json` tasks, which invoke the Node binaries in `node_modules` (Node stays the runtime).

**`deno.json` Tasks** (run via `deno task <name>`):

- `dev` - `node ./node_modules/next/dist/bin/next dev` (Turbopack)
- `build` - `node ./node_modules/next/dist/bin/next build`
- `start` - `node ./node_modules/next/dist/bin/next start`
- `lint` - `node ./node_modules/eslint/bin/eslint.js .`
- `typecheck` - `node ./node_modules/typescript/bin/tsc --noEmit`
- `db:generate` - `node ./node_modules/drizzle-kit/bin.cjs generate`
- `db:migrate` - `node ./node_modules/drizzle-kit/bin.cjs migrate`
- `db:push` - `node ./node_modules/drizzle-kit/bin.cjs push`
- `db:studio` - `node ./node_modules/drizzle-kit/bin.cjs studio`
- `db:seed` - `node ./node_modules/tsx/dist/cli.mjs src/db/seed.ts` (loads `.env` itself via `dotenv/config`)
- `vercel:build` - generate migrations then `next build`
- `vercel:deploy` - migrate then `vercel --prod`

> Note: `drizzle.config.ts` already loads `.env` via `dotenv`, and `seed.ts` imports `dotenv/config` — so no `dotenv -e` prefix is needed in the task commands.

### `drizzle.config.ts`

**Purpose**: Drizzle Kit configuration
**Exports**: Default config object

- `dialect: "postgresql"`
- `schema: "./src/db/schema.ts"`
- `out: "./drizzle"`
- `dbCredentials.url` - From `DATABASE_URL` env var (local PostgreSQL)

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
    │     ├── db.query() ──────► PostgreSQL (local)
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
