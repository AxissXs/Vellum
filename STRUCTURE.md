# Project Structure - Vellum (UI brand: Perfect)

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
├── ops/
│   └── llm-health-cron/    # Companion native Deno Deploy cron app
│       ├── deno.json       # Companion tasks + Deploy app config
│       └── main.ts         # Every 5m POST /api/cron/llm-health
├── public/                 # Static assets
│   ├── logo.svg            # Brand wordmark (light / colored)
│   ├── logo-white.svg      # Brand wordmark (dark backgrounds)
│   ├── icon.svg            # Favicon
│   ├── sw.js               # Service worker (Web Push)
│   └── deploy/             # Deploy migrations copied at build
├── tsconfig.json           # TypeScript config
├── next.config.ts          # Next.js config
├── eslint.config.mjs       # ESLint config (flat)
├── postcss.config.mjs      # PostCSS config
├── drizzle.config.ts       # Drizzle Kit config (TypeScript)
├── scripts/                # Ops diagnostics (excluded from tsc)
│   └── check-db-colocation.ts  # Edge vs PG latency probe
└── drizzle/                # Drizzle migrations (committed)
    ├── 0000_faithful_the_twelve.sql
    ├── 0005_even_dreadnoughts.sql  # Notifications, push, telegram, audit IP
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
│   │   ├── calendar/
│   │   │   ├── page.tsx              # Calendar page (server)
│   │   │   └── CalendarClient.tsx    # Month grid My/Team + schedule modal
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
│   │   ├── settings/
│   │   │   └── page.tsx              # Notification prefs, push toggle, Telegram pairing
│   │   ├── super-admin/
│   │   │   ├── page.tsx                    # Super-admin page (server)
│   │   │   ├── SuperAdminClient.tsx        # Tabbed super-admin shell
│   │   │   ├── SuperAdminUsersPanel.tsx    # Users management
│   │   │   ├── SuperAdminActivityPanel.tsx # Live activity feed
│   │   │   ├── SuperAdminSessionsPanel.tsx # Session revoke
│   │   │   ├── SuperAdminAuditPanel.tsx    # Filterable audit logs
│   │   │   ├── SuperAdminHealthPanel.tsx   # System health metrics
│   │   │   ├── SuperAdminRolesPanel.tsx    # Role/permission matrix
│   │   │   └── SuperAdminTelegramPanel.tsx # Telegram bot settings
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
│       ├── notifications/
│       │   ├── route.ts            # GET - List notifications
│       │   ├── mark-all-read/route.ts  # POST - Mark all read
│       │   └── [id]/route.ts       # PATCH - Mark one read
│       ├── push/
│       │   ├── subscribe/route.ts  # POST, DELETE - Web Push subscription
│       │   └── preferences/route.ts # GET, PATCH - Channel prefs
│       ├── telegram/
│       │   ├── status/route.ts     # GET - Link status
│       │   ├── pairing-code/route.ts  # GET - Generate pairing code
│       │   ├── unlink/route.ts     # DELETE - Unlink account
│       │   ├── webhook/route.ts    # POST - Bot webhook (secret token)
│       │   └── config/route.ts     # GET - Public bot configured check
│       ├── super-admin/
│       │   ├── users/route.ts      # GET - List users
│       │   ├── users/[id]/route.ts # PATCH - Update status/role
│       │   ├── activity/route.ts   # GET - Activity feed
│       │   ├── sessions/route.ts   # GET - Active sessions
│       │   ├── sessions/[id]/route.ts  # DELETE - Revoke session
│       │   ├── audit/route.ts      # GET - Audit logs
│       │   ├── audit/export/route.ts   # GET - Export csv/pdf
│       │   ├── health/route.ts     # GET - Health metrics
│       │   ├── permissions/route.ts # GET - Role matrix
│       │   └── telegram/
│       │       ├── settings/route.ts  # GET, PATCH - Bot settings + auto webhook
│       │       ├── topics/route.ts    # POST - Create forum topic
│       │       ├── stats/route.ts     # GET - Usage stats
│       │       ├── test/route.ts      # POST - Test message (optional token)
│       │       └── llm-health/route.ts # GET, POST, PATCH - Ollama health + think
│       ├── cron/
│       │   └── llm-health/route.ts # GET, POST - Cron probe (CRON_SECRET)
│       ├── activity/
│       │   └── route.ts            # GET - Activity logs
│       ├── calendar/
│       │   └── route.ts            # GET - Aggregated calendar events
│       ├── schedules/
│       │   ├── route.ts            # POST - Create schedule
│       │   └── [id]/route.ts       # PATCH, DELETE - Schedule CRUD
│       ├── stats/
│       │   └── route.ts            # GET - Dashboard statistics
│       └── health/
│           └── route.ts            # GET - Health check
├── components/             # Shared React Components
│   ├── BrandLogo.tsx       # Whitelabel logo from brand config
│   ├── BrandVars.tsx       # Runtime CSS brand color scale injection
│   ├── LoginForm.tsx       # Login form (client)
│   ├── NotificationBell.tsx # In-app notification centre (client)
│   ├── PushNotificationToggle.tsx # Web Push enable/disable (client)
│   ├── RichTextEditor.tsx  # TipTap editor wrapper
│   ├── Sidebar.tsx         # Navigation sidebar (client)
│   ├── SidebarMiniCalendar.tsx # Team month density widget in sidebar
│   └── ui/
│       └── Switch.tsx      # Toggle switch primitive
├── db/                     # Database Layer
│   ├── index.ts            # Drizzle client export
│   ├── schema.ts           # Database schema (tables, enums, relations)
│   ├── seed.ts             # Full demo data seeding
│   └── bootstrap.ts        # Auto-seed on first API call
├── hooks/                  # React Query Hooks
│   ├── useCalendar.ts      # Calendar query + schedule mutations
│   ├── useComments.ts      # Comment mutations (create/update/delete) with optimistic updates
│   ├── useMilestones.ts    # Milestone mutations with optimistic updates
│   ├── useNotificationPreferences.ts # Notification channel prefs
│   ├── useNotifications.ts # In-app notifications + mark read
│   ├── useProjects.ts      # Project mutations with optimistic updates
│   ├── usePushNotifications.ts # Web Push subscribe/unsubscribe
│   ├── useRealtime.ts      # Real-time task/comment updates via Pusher
│   ├── useRetros.ts        # Retro item mutations with optimistic updates
│   ├── useSprints.ts       # Sprint mutations with optimistic updates
│   ├── useStandups.ts      # Standup queries and upsert mutations
│   ├── useTasks.ts         # Task mutations (CRUD, reorder) with optimistic updates
│   ├── useTeams.ts         # Team mutations with optimistic updates
│   ├── useTelegram.ts      # Telegram status, pairing, unlink
│   └── useUsers.ts         # User mutations with optimistic updates
├── lib/                    # Utilities
│   ├── activity.ts         # Deferred activity-log writes (`after()`)
│   ├── api.ts              # API client helpers
│   ├── holidays/
│   │   ├── index.ts        # Country registry + getHolidaysInRange (client-safe)
│   │   ├── types.ts        # Holiday / HolidayCountryCode types
│   │   ├── malaysia.ts     # MY holidays 2025–2027
│   │   ├── singapore.ts    # SG holidays
│   │   ├── indonesia.ts    # ID holidays
│   │   ├── philippines.ts  # PH holidays
│   │   ├── thailand.ts     # TH holidays
│   │   ├── australia.ts    # AU holidays
│   │   ├── united-kingdom.ts # GB bank holidays
│   │   └── united-states.ts  # US federal holidays
│   ├── holidays-server.ts  # getHolidayCountry (platform setting)
│   ├── audit.ts            # Client IP helper for audit logs
│   ├── auth.ts             # Authentication utilities (React `cache` + session JOIN)
│   ├── brand.ts            # Whitelabel brand config (name, logos, colors, email domain)
│   ├── notifications.ts    # In-app + multi-channel notification dispatch
│   ├── permissions.ts      # Role permission matrix + hasPermission / requirePermission
│   ├── push.ts             # Web Push send + preference helpers
│   ├── pusher.ts           # Pusher server instance
│   ├── pusher-broadcast.ts # Broadcast task/comment events
│   ├── pusher-channels.ts  # Server-side channel ref counting
│   ├── pusher-client.ts    # Pusher client singleton + ref counting
│   ├── kanban-realtime.ts  # Apply Pusher task events to Kanban columns
│   ├── mentions.ts         # Parse @FirstName mentions from comment markdown
│   ├── telegram.ts         # Telegram bot API + pairing helpers
│   ├── telegram-bot/       # Inbound bot command flows (DM)
│   ├── telegram-interpret/ # NL schema, Ollama client, health/think
│   │   ├── schema.ts
│   │   ├── required.ts
│   │   ├── ollama.ts
│   │   └── health.ts       # /api/tags probe, breaker, think setting
│   └── telegram-dates.ts   # Date/range parsing for bot commands
└── providers/              # React Context Providers
    └── QueryProvider.tsx   # React Query + Sonner + Devtools provider
```

## File Details

### `src/app/globals.css`

**Purpose**: Global styles, Tailwind imports, CSS variables for theming
**Exports**: None (CSS file)

### `src/app/layout.tsx`

**Purpose**: Root HTML layout, metadata (no Vercel Analytics — app runs on Deno Deploy)
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
**Responsive**:
- Holds `mobileNavOpen` state driving the off-canvas `Sidebar` drawer
- Renders a mobile-only top bar (`lg:hidden`) with a hamburger button + logo
- Renders a click-to-close backdrop when the drawer is open (`lg:hidden`)
- Locks body scroll while the drawer is open
- Main content: `pl-0 lg:pl-[260px]` so the sidebar only offsets content at `lg+`
- Renders `NotificationBell` in the mobile top bar and desktop header

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

### `src/app/dashboard/calendar/page.tsx`

**Purpose**: Team/personal calendar page
**Exports**: `CalendarPage()` - Server component (auth + Suspense)

### `src/app/dashboard/calendar/CalendarClient.tsx`

**Purpose**: Month grid with My/Team scope, layer toggles, day detail, schedule create/edit modal
**Exports**: `CalendarClient({ userId, userRole })` - Client component

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
**Exports**: `TaskDetailModal({ task, users, currentUserId, userRole?, onClose, onChange, onDelete? })` - Client component

- Two-column layout; visual status/priority selectors; searchable assignee (`TaskAssigneePopover`)
- Soft-delete confirmation (restorable via Super Admin Trash)
- Comments with 1-level threaded replies (`parentId`)
- Real-time comment updates via `useRealtime()`

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

### `src/app/dashboard/settings/page.tsx`

**Purpose**: User notification settings (in-app / push / email / Telegram prefs, push toggle, Telegram pairing + how-to guide)
**Exports**: `SettingsPage()` - Client component

### `src/app/dashboard/super-admin/page.tsx`

**Purpose**: Super-admin dashboard (server); requires `superadmin` role
**Exports**: `SuperAdminPage()` - Server component

### `src/app/dashboard/super-admin/SuperAdminClient.tsx`

**Purpose**: Tabbed shell for super-admin panels
**Exports**: `SuperAdminClient()` - Client component
**Tabs**: Users, Activity, Sessions, Audit, Health, Roles, Telegram, Locale (timezone + holiday country)

### `src/app/dashboard/super-admin/SuperAdminActivityPanel.tsx`

**Purpose**: Live user activity feed (polling)
**Exports**: `SuperAdminActivityPanel()` - Client component

### `src/app/dashboard/super-admin/SuperAdminSessionsPanel.tsx`

**Purpose**: Active session list with revoke
**Exports**: `SuperAdminSessionsPanel()` - Client component

### `src/app/dashboard/super-admin/SuperAdminAuditPanel.tsx`

**Purpose**: Filterable audit logs + export
**Exports**: `SuperAdminAuditPanel()` - Client component

### `src/app/dashboard/super-admin/SuperAdminHealthPanel.tsx`

**Purpose**: System health metrics cards
**Exports**: `SuperAdminHealthPanel()` - Client component

### `src/app/dashboard/super-admin/SuperAdminRolesPanel.tsx`

**Purpose**: Role × permission matrix
**Exports**: `SuperAdminRolesPanel()` - Client component

### `src/app/dashboard/super-admin/SuperAdminTelegramPanel.tsx`

**Purpose**: Telegram bot settings — token, auto webhook, supergroup/channel IDs, per-event forum topics, channel event allowlist, HTML templates, test connection, setup guide
**Exports**: `SuperAdminTelegramPanel()` - Client component

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

- `GET(req)` - List comments (query: `taskId`); includes `parentId`
- `POST(req)` - Create comment (optional `parentId` for 1-level replies)

#### `src/app/api/notifications/route.ts`

**Methods**: `GET`
**Purpose**: List in-app notifications for current user
**Functions**:

- `GET(req)` - Returns notifications including optional `url` deep link

#### `src/app/api/sessions/me/route.ts`

**Methods**: `GET`, `DELETE`
**Purpose**: Current user's active sessions
**Functions**:

- `GET(req)` - List own sessions
- `DELETE(req)` - Revoke all other sessions

#### `src/app/api/sessions/me/[id]/route.ts`

**Methods**: `DELETE`
**Purpose**: Revoke a single own session
**Functions**:

- `DELETE(req, { params })` - Revoke session by id (self only)

#### `src/app/api/super-admin/trash/route.ts`

**Methods**: `GET`
**Purpose**: List soft-deleted entities (superadmin)
**Functions**:

- `GET(req)` - Paginated trash with type/search filters

#### `src/app/api/super-admin/restore/route.ts`

**Methods**: `PATCH`
**Purpose**: Bulk restore soft-deleted entities (superadmin)
**Functions**:

- `PATCH(req)` - Body `{ entities: [{ type, id }] }`

#### `src/app/api/super-admin/audit/[id]/route.ts`

**Methods**: `GET`
**Purpose**: Audit log detail with snapshots
**Functions**:

- `GET(req, { params })` - Log + actor + snapshots + timeline

#### `src/app/api/notifications/[id]/route.ts`

**Methods**: `PATCH`
**Purpose**: Mark a notification as read
**Functions**:

- `PATCH(req, { params })` - Mark notification read

#### `src/app/api/notifications/mark-all-read/route.ts`

**Methods**: `POST`
**Purpose**: Mark all notifications as read for current user
**Functions**:

- `POST(req)` - Mark all read

#### `src/app/api/push/subscribe/route.ts`

**Methods**: `POST`, `DELETE`
**Purpose**: Web Push subscription management
**Functions**:

- `POST(req)` - Store push subscription
- `DELETE(req)` - Remove push subscription

#### `src/app/api/push/preferences/route.ts`

**Methods**: `GET`, `PATCH`
**Purpose**: Per-event notification channel preferences
**Functions**:

- `GET()` - List preferences (creates defaults if missing)
- `PATCH(req)` - Update preference for an event type/channel

#### `src/app/api/telegram/status/route.ts`

**Methods**: `GET`
**Purpose**: Current user's Telegram link status
**Functions**:

- `GET()` - Returns linked status / username

#### `src/app/api/telegram/pairing-code/route.ts`

**Methods**: `GET`
**Purpose**: Generate a one-time Telegram pairing code
**Functions**:

- `GET()` - Returns pairing code + expiry

#### `src/app/api/telegram/unlink/route.ts`

**Methods**: `DELETE`
**Purpose**: Unlink Telegram from current user
**Functions**:

- `DELETE()` - Clears `telegramChatId` / `telegramUsername`

#### `src/app/api/telegram/webhook/route.ts`

**Methods**: `POST`
**Purpose**: Telegram bot webhook (pairing + inbound commands); verifies `X-Telegram-Bot-Api-Secret-Token`
**Functions**:

- `POST(req)` - Pairing via `/start <code>`; delegates other messages/callbacks to `handleTelegramUpdate` in `src/lib/telegram-bot/`

#### `src/app/api/telegram/config/route.ts`

**Methods**: `GET`
**Purpose**: Public check whether Telegram bot is configured (no auth)
**Functions**:

- `GET()` - Returns `{ configured, username }`

#### `src/app/api/super-admin/activity/route.ts`

**Methods**: `GET`
**Purpose**: Super-admin live activity feed (requires `superadmin`)
**Functions**:

- `GET()` - Recent activity + login stats

#### `src/app/api/super-admin/sessions/route.ts`

**Methods**: `GET`
**Purpose**: List active auth sessions
**Functions**:

- `GET()` - Sessions with user name / IP

#### `src/app/api/super-admin/sessions/[id]/route.ts`

**Methods**: `DELETE`
**Purpose**: Revoke a session
**Functions**:

- `DELETE(req, { params })` - Delete session by ID

#### `src/app/api/super-admin/audit/route.ts`

**Methods**: `GET`
**Purpose**: Filterable audit logs (`activity_logs` + IP)
**Functions**:

- `GET(req)` - Filters: user, action, date range, IP

#### `src/app/api/super-admin/audit/export/route.ts`

**Methods**: `GET`
**Purpose**: Export filtered audit logs
**Functions**:

- `GET(req)` - Query `format=csv|pdf`

#### `src/app/api/super-admin/health/route.ts`

**Methods**: `GET`
**Purpose**: System health metrics
**Functions**:

- `GET()` - DB pool, latency, error counts, active sessions

#### `src/app/api/super-admin/permissions/route.ts`

**Methods**: `GET`
**Purpose**: Role / permission matrix data (sourced from `src/lib/permissions.ts`)
**Functions**:

- `GET()` - Roles, permissions, and rolePermissions map (superadmin only)

#### `src/lib/permissions.ts`

**Purpose**: Single source of truth for role → permission matrix; used by APIs and UI
**Exports**:
- `PERMISSIONS`, `ROLE_PERMISSIONS`, `ROLES`, `PermissionId`, `RoleId`
- `hasPermission(role, permission)` - Boolean check
- `requirePermission(user, permission)` - Asserts auth + permission (throws)
- `canMutateOwned(user, authorId)` - Author or admin+ may mutate (retros)

**Notes**: Project/task/sprint mutate routes call `hasPermission`. Members may CRUD tasks but not projects/sprints. Retro PATCH/DELETE requires author or admin+.

#### `src/app/api/super-admin/telegram/settings/route.ts`

**Methods**: `GET`, `PATCH`
**Purpose**: Platform Telegram bot settings (token, IDs, topics, channel events, templates); auto `setWebhook` on save
**Functions**:

- `GET()` - Settings, topics, channelEvents, templates, webhookUrl
- `PATCH(req)` - Update settings; optional `webhookOrigin` for Deploy without env URL

#### `src/app/api/super-admin/telegram/topics/route.ts`

**Methods**: `POST`
**Purpose**: Create a forum topic in the configured supergroup and map it to an event type
**Functions**:

- `POST(req)` - Body: `{ eventType, name? }` → creates topic via Bot API

#### `src/app/api/super-admin/telegram/stats/route.ts`

**Methods**: `GET`
**Purpose**: Telegram usage stats
**Functions**:

- `GET()` - Linked users / recent sends

#### `src/app/api/super-admin/telegram/test/route.ts`

**Methods**: `POST`
**Purpose**: Send a Telegram test message
**Functions**:

- `POST(req)` - Test bot connectivity; optional token override (test-before-save)

#### `src/app/api/super-admin/telegram/llm-health/route.ts`

**Methods**: `GET`, `POST`, `PATCH`
**Purpose**: Super-admin Ollama interpret health + thinking toggle
**Functions**:

- `GET()` - `{ configured, model, thinkEnabled, health }`
- `POST()` - Force `probeLlmHealth` (source `probe`)
- `PATCH(req)` - Body `{ thinkEnabled: boolean }` → `platform_settings.llm_interpret_think`

#### `src/app/api/cron/llm-health/route.ts`

**Methods**: `GET`, `POST`
**Purpose**: Scheduled LLM health probe target (companion Deno cron app / curl)
**Auth**: `Authorization: Bearer CRON_SECRET` or `x-cron-secret`
**Functions**:

- `GET|POST` - Run probe, persist `llm_interpret_health`, return snapshot

#### `src/app/api/activity/route.ts`

**Methods**: `GET`
**Purpose**: Activity logs
**Functions**:

- `GET(req)` - List activity (pagination, filters)

#### `src/app/api/calendar/route.ts`

**Methods**: `GET`
**Purpose**: Aggregated calendar feed
**Functions**:

- `GET(req)` - Query `from`, `to`, `scope=me|team`, `userId`, `layers` → schedules, activity, task due dates, configured-country holidays, leave conflicts

#### `src/app/api/schedules/route.ts`

**Methods**: `POST`
**Purpose**: Create schedule event
**Functions**:

- `POST(req)` - Create schedule (own or any user if `manage_schedules`); notifies assignee; returns leave conflicts

#### `src/app/api/schedules/[id]/route.ts`

**Methods**: `PATCH`, `DELETE`
**Purpose**: Update/delete schedule
**Functions**:

- `PATCH(req, { params })` - Update schedule fields
- `DELETE(req, { params })` - Delete schedule

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

#### `src/components/BrandLogo.tsx`

**Purpose**: Whitelabel logo image from `brand.logo`
**Exports**: `BrandLogo({ variant?, className?, showName? })` - Client component
**Notes**: `variant="light"` = colored wordmark; `variant="dark"` = white wordmark for dark UIs

#### `src/components/BrandVars.tsx`

**Purpose**: Injects `--color-brand-*` CSS vars from `brand.primaryColor` at runtime
**Exports**: `BrandVars()` - Client component (renders null; mounts in root layout)

#### `src/components/LoginForm.tsx`

**Purpose**: Login form with email/password
**Exports**: `LoginForm()` - Client component
**Props**: None (uses `useRouter`, `useState`)
**Features**: Form validation, error display, loading state

#### `src/components/NotificationBell.tsx`

**Purpose**: In-app notification centre (bell + unread badge + dropdown)
**Exports**: `NotificationBell()` - Client component
**Features**: Polling + Pusher `user-{id}` channel; mark one / all read via `useNotifications`

#### `src/components/PushNotificationToggle.tsx`

**Purpose**: Enable/disable Web Push subscription
**Exports**: `PushNotificationToggle()` - Client component
**Features**: Uses `usePushNotifications`; registers `public/sw.js`

#### `src/components/ui/Switch.tsx`

**Purpose**: Accessible toggle switch primitive
**Exports**: `Switch({ checked, onCheckedChange, disabled })` - Client component

#### `src/components/RichTextEditor.tsx`

**Purpose**: TipTap-based rich text editor
**Exports**: `RichTextEditor({ content, onChange, placeholder })` - Client component
**Dependencies**: `@tiptap/react`, `@tiptap/starter-kit`

#### `src/components/Sidebar.tsx`

**Purpose**: Collapsible navigation sidebar / mobile drawer
**Exports**: `Sidebar({ user, mobileOpen?, onClose? })` - Client component
**Props**: `user: AuthUser`, `mobileOpen?: boolean`, `onClose?: () => void`
**Features**:

- Collapsible icon-rail mode (`lg+` only via chevron toggle)
- Off-canvas drawer below `lg`: slides in when `mobileOpen`, hidden (`-translate-x-full`) otherwise; always on-canvas at `lg+`
- Mobile close (`X`) button (below `lg`); nav links call `onClose` to auto-close the drawer
- Navigation links (Dashboard, Kanban, Projects, Tasks, Teams, Sprints, Activity, Calendar, Settings, Admin, Super Admin)
- Role-based Admin / Super Admin links
- `SidebarMiniCalendar` team density widget (hidden when collapsed on `lg+`)
- User avatar with initials, role badge
- Logout button

#### `src/components/SidebarMiniCalendar.tsx`

**Purpose**: Compact current-month team calendar with schedule/holiday dots
**Exports**: `SidebarMiniCalendar()` - Client component
**Features**: Links each day to `/dashboard/calendar?date=&scope=team`

---

### Database (`src/db/`)

#### `src/db/index.ts`

**Purpose**: Drizzle client singleton
**Exports**:

- `db` - Drizzle database instance
- `pool` - pg Pool (`max: 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`, `allowExitOnIdle`)
  **Pattern**: Global singleton for connection pooling in non-production (HMR-safe)

#### `src/db/schema.ts`

**Purpose**: Complete database schema definition
**Exports** (Tables):

- `users` - User accounts (`telegramChatId`, `telegramUsername`; status enum)
- `teams` - Teams
- `teamMembers` - Team membership (indexes: `team_id`, `user_id`)
- `projects` - Projects
- `projectMilestones` - Project milestones
- `projectNotes` - Project notes
- `tasks` - Kanban tasks (includes `sprintId`, `estimate`; indexes: `project_id`, `sprint_id`, `assignee_id`)
- `sprints` - Time-boxed sprints per project (index: `project_id`)
- `standups` - Daily standup entries per user (indexes: `user_id`, `(user_id, date)`)
- `retroItems` - Sprint retrospective items
- `taskStatusHistory` - Task status change history (burndown)
- `comments` - Task comments (index: `task_id`)
- `sessions` - Auth sessions (index: `user_id`)
- `userSessions` - Login history (IP, userAgent, success/failure)
- `activityLogs` - Activity audit trail (`ipAddress`; index: `created_at`)
- `notifications` - In-app notifications
- `pushSubscriptions` - Web Push subscriptions
- `notificationPreferences` - Per-event channel prefs (push / in-app / email / telegram)
- `telegramPairingCodes` - One-time Telegram pairing codes
- `platformSettings` - Key/value platform config (Telegram bot settings)
- `scheduleEvents` - User schedules (work/meeting/leave/training/other) with visibility

**Exports** (Enums):

- `userRoleEnum` - `superadmin` | `admin` | `member`
- `userStatusEnum` - `active` | `inactive` | `banned`
- `taskStatusEnum` - `backlog` | `todo` | `in_progress` | `review` | `done`
- `taskPriorityEnum` - `low` | `medium` | `high` | `urgent`
- `notificationEventTypeEnum` - `task_assigned` | `task_mentioned` | `due_date_approaching` | `status_changed` | `new_comment` | `comment_mention` | `schedule_assigned`
- `scheduleTypeEnum` - `work` | `meeting` | `leave` | `training` | `other`
- `scheduleVisibilityEnum` - `team` | `private`

**Relations**: Defined via Drizzle `references()` and foreign keys
**Migrations**: Hot-path FK/order indexes in `drizzle/0004_flimsy_sauron.sql`; notifications/push/telegram/audit IP in `drizzle/0005_even_dreadnoughts.sql`; schedule events + `schedule_assigned` in `drizzle/0006_charming_crusher_hogan.sql`

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
- `useRealtime(projectId?, taskId?, onTaskEvent?)` - Subscribe to live updates
- `TaskUpdatePayload`, `CommentUpdatePayload` - Event payload types

**Behavior**:
- Project board: `project-${projectId}`; global board: `task-updates`
- Invalidates React Query task/comment caches
- Calls `onTaskEvent` for remote actors (Kanban applies to local `columns`)
- Toast for other users' changes (skips self)

#### `src/lib/kanban-realtime.ts`

**Purpose**: Apply Pusher task events to local Kanban column state
**Exports**:
- `applyTaskEventToColumns(columns, payload, options?)` - Merge create/update/delete/reorder into columns
- `KanbanColumn`, `KanbanTask` types

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
- `useUpdateRetroItem()` - Update retro item content/category
- `useDeleteRetroItem()` - Delete retro item

#### `src/hooks/useNotifications.ts`

**Purpose**: In-app notifications list, unread count, mark-read mutations
**Exports**:
- `getNotificationsQueryKey()` / `getUnreadCountQueryKey()` - Query keys
- `useNotifications()` - Returns `{ notifications, unreadCount, isLoading, markRead, markAllRead }`; Pusher `user-{id}` for live badge

#### `src/hooks/useNotificationPreferences.ts`

**Purpose**: Per-event notification channel preferences
**Exports**:
- `useNotificationPreferences()` - Fetch prefs
- `useUpdateNotificationPreference()` - Patch event/channel toggle

#### `src/hooks/usePushNotifications.ts`

**Purpose**: Web Push subscribe/unsubscribe via VAPID + service worker
**Exports**:
- `usePushNotifications()` - Returns support/subscribed state + subscribe/unsubscribe actions

#### `src/hooks/useTelegram.ts`

**Purpose**: Telegram account linking for the current user
**Exports**:
- `useTelegramStatus()` - Link status
- `useGeneratePairingCode()` - Generate pairing code
- `useUnlinkTelegram()` - Unlink Telegram

#### `src/hooks/useCalendar.ts`

**Purpose**: Calendar aggregate query + schedule CRUD mutations
**Exports**:
- `useCalendar(params)` - Fetch schedules/activity/tasks/holidays/conflicts
- `useCreateSchedule()` / `useUpdateSchedule()` / `useDeleteSchedule()` - Schedule mutations with toast + conflict warnings
- Types: `ScheduleEvent`, `CalendarData`, `CalendarLayers`, etc.

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

#### `src/lib/brand.ts`

**Purpose**: Whitelabel brand source of truth (name, logos, primary color, email domain, font var)
**Exports**:
- `BrandConfig` - Brand shape
- `brand` - Resolved config (defaults = Perfect; overridable via `NEXT_PUBLIC_BRAND_*`)
- `DEFAULT_BRAND_COLOR` - Default primary used in `globals.css` (`#0052cc`)

#### `src/lib/auth.ts`

**Purpose**: Authentication utilities
**Exports**:

- `AuthUser` - Type for authenticated user
- `getSession(): Promise<AuthUser | null>` - Request-memoized via React `cache()`; single `sessions` LEFT JOIN `users` query
- `createSession(userId): Promise<string>` - Create new session
- `destroySession(sessionId)` - Delete session
- `authenticateUser(email, password): Promise<AuthUser | null>` - Verify credentials (async bcrypt `compare`)
- `requireAuth(user)` - Assert user exists (throws)
- `requireRole(user, roles)` - Assert user has role (throws)
- `SESSION_COOKIE` - Cookie name constant
- `SESSION_MAX_AGE` - Session duration (7 days)

**Notes**: Prefer `hasPermission` / `requirePermission` from `lib/permissions.ts` for entity CRUD. Use `requireRole` for coarse admin/superadmin gates.

#### `src/lib/holidays/index.ts`

**Purpose**: Multi-country public holiday registry (2025–2027 curated lists)
**Exports**:
- `Holiday`, `HolidayCountryCode`, `HolidayCountryOption`
- `HOLIDAY_COUNTRIES`, `DEFAULT_HOLIDAY_COUNTRY`, `HOLIDAY_COUNTRY_SETTING_KEY`
- `isValidHolidayCountry(code)`, `getHolidaysForYear(country, year)`, `getHolidaysInRange(country, from, to, timeZone?)`

#### `src/lib/holidays-server.ts`

**Purpose**: Server-only holiday country from `platform_settings`
**Exports**:
- `getHolidayCountry()` - Cached resolver (default `MY`)

#### `src/lib/holidays/malaysia.ts`

**Purpose**: Curated Malaysia federal and religious public holidays (2025–2027)
**Exports**:
- `getMalaysiaHolidays(year)` - Holidays for a year

#### `src/lib/activity.ts`

**Purpose**: Deferred activity-log inserts for mutating API routes
**Exports**:

- `ActivityLogInput` - Shape for activity rows (optional `tag`, `severity`, `snapshots`)
- `logActivity(input)` - Schedules insert with Next.js `after()` (non-blocking for response); writes optional `activity_log_snapshots`

#### `src/lib/audit.ts`

**Purpose**: Client IP + activity tag/severity classification helpers
**Exports**:

- `getClientIP(req)` / `getClientIPFromHeaders(headers)` - Resolve IP
- `classifyTag(action)` / `classifySeverity(action)` - Audit metadata
- `Snapshot` - Optional snapshot shape for `logActivity`

#### `src/lib/last-seen.ts`

**Purpose**: Throttled user last-seen updates (fire-and-forget from `getSession`)
**Exports**:

- `shouldUpdateLastSeen(userId)` / `updateLastSeen(userId, ip)`

#### `src/lib/notifications.ts`

**Purpose**: Multi-channel notification dispatch (in-app, push, Telegram DM + supergroup/channel broadcast)
**Exports**:

- `isInAppEnabled(userId, eventType)` - Check in-app preference
- `sendInAppNotification(...)` - Insert notification + Pusher badge event
- `sendNotification(...)` - Fan-out to enabled channels (incl. `broadcastToSupergroup` / `maybeBroadcastToChannel`)

#### `src/lib/push.ts`

**Purpose**: Web Push send and preference helpers (VAPID)
**Exports**:

- `sendPushNotification(userId, payload)` - Send via `web-push`
- `getNotificationPreferences(userId)` / `getDefaultNotificationPreferences()` / `ensureNotificationPreferences(userId)`
- `updateNotificationPreference(...)` / `isPushEnabled(userId, eventType)`

#### `src/lib/mentions.ts`

**Purpose**: Resolve `@FirstName` tokens in comment markdown to user IDs (matches RichTextEditor insert format)
**Exports**:
- `extractMentionTokens(content)` - Unique @tokens (lowercased)
- `resolveMentionedUserIds(content, users)` - User IDs matching first/compact name

#### `src/lib/telegram.ts`

**Purpose**: Telegram Bot API helpers — pairing DMs, templates, forum topics, channel allowlist, webhook secret/URL
**Exports**:

- `TELEGRAM_EVENT_TYPES` / `TelegramEventType`
- `getBotToken` / `isTelegramConfigured` / `getWebhookUrl` / `getWebhookSecretToken`
- `getTelegramTopicMapping` / `getChannelEvents` / `setChannelEvents`
- `getTelegramTemplate` / `setTelegramTemplate` / `getDefaultTemplate`
- `getTelegramBotInfo` / `setTelegramWebhook` / `sendTelegramMessage` / `answerCallbackQuery` / `editMessageText`
- `InlineKeyboardMarkup` / `InlineKeyboardButton` types
- `isTelegramEnabled` / `sendTelegramNotification`
- `broadcastToSupergroup(eventType, text)` / `maybeBroadcastToChannel` / `broadcastToChannel`

#### `src/lib/telegram-bot/`

**Purpose**: Inbound Telegram bot — create/view tasks & calendar, standup, retro, comments, status, inbox (private DM only)
**Entry**: `handleTelegramUpdate(update)` from `index.ts`
**Key modules**: `auth`, `sessions`, `nl-flow` (free-text Ollama interpret), `task-flow`, `event-flow`, `list-*`, `status-flow`, `comment-flow`, `inbox-flow`, `standup-flow`, `leave-flow`, `retro-flow`

#### `src/lib/telegram-interpret/`

**Purpose**: Shared NL intent schema + Ollama client + health watchdog for Telegram free-text
**Exports**:
- `schema` — `TelegramInterpretResult`, JSON schema for Ollama `format`
- `required` — `getMissingFields`, intent helpers
- `ollama` — `interpretTelegramText`, `isInterpretConfigured` (gates on health; uses `think` from settings)
- `health` — `probeLlmHealth`, `getLlmHealth`, `isLlmHealthyForNl`, `recordInterpretSuccess` / `Failure`, `getInterpretThinkEnabled` / `setInterpretThinkEnabled`
**Platform keys**: `llm_interpret_health` (JSON snapshot), `llm_interpret_think` (`"true"`/`"false"`, default on)

#### Shared entity services (Telegram + REST)

- `src/lib/create-task.ts` — `createTaskForUser`
- `src/lib/create-schedule.ts` — `createScheduleForUser`
- `src/lib/update-task.ts` — `updateTaskForUser`
- `src/lib/create-comment.ts` — `createCommentForUser`, `queryCommentsForTask`
- `src/lib/query-tasks.ts` — `queryTasks`, `resolveTaskRef`
- `src/lib/query-calendar.ts` — `queryCalendar`
- `src/lib/query-notifications.ts` — inbox helpers
- `src/lib/upsert-standup.ts` — `upsertStandupForUser`
- `src/lib/create-retro-item.ts` — retro + active sprint queries
- `src/lib/telegram-dates.ts` — date/range parsing for bot commands

**Schema**: `telegram_bot_sessions` — wizard state (task/event/standup/retro flows)

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

**Purpose**: Broadcast task/comment/schedule events to Pusher channels (awaited in-request)
**Exports**:
- `broadcastTaskEvent(projectId, payload)` - Trigger on `project-${id}` + `task-updates` (must await; Deno Deploy drops `after()`)
- `broadcastCommentEvent(taskId, payload)` - Trigger on `task-${id}` (must await)
- `broadcastScheduleEvent(payload)` - Trigger on `calendar-updates` (must await)

#### `src/lib/pusher-channels.ts`

**Purpose**: Legacy channel ref counting module (prefer `pusher-client.ts` helpers)
**Exports**:
- `subscribeChannel(name)` - Increment ref count and subscribe
- `unsubscribeChannel(name)` - Decrement ref count and unsubscribe when 0

#### `src/lib/pusher-client.ts`

**Purpose**: Pusher client singleton and channel ref counting for browser
**Exports**:
- `getPusherClientAsync()` - Shared Pusher-js instance; build-time `NEXT_PUBLIC_*` or runtime `GET /api/pusher/config`
- `getPusherClient()` - Sync accessor after async init (may be null before init)
- `subscribeChannel(name, client)` / `unsubscribeChannel(name, client)` - Ref-counted subscribe

#### `src/app/api/pusher/config/route.ts`

**Purpose**: Runtime public Pusher key/cluster for the browser
**Exports**:
- `GET()` - `{ configured, key?, cluster? }` from `PUSHER_KEY` / `PUSHER_CLUSTER`

---

## Configuration Files

### `ops/llm-health-cron/`

Companion Deno Deploy app because the main Next.js app starts through
`jsr:@deno/nextjs-start/v16` and cannot register top-level `Deno.cron()`.

- `main.ts` - Native `Deno.cron("perfect-llm-health", "*/5 * * * *", ...)`; POSTs to the main app health route with retries.
- `deno.json` - App `perfect-llm-health-cron`; `check`, `dev`, and `deploy` tasks.
- Runtime env: `APP_URL` (main Perfect origin), `CRON_SECRET` (same secret as main app).

### `package.json`

Holds `dependencies`/`devDependencies` only (Deno reads these for `deno install`). No `scripts` block — execution is defined in `deno.json` tasks, which invoke the Node binaries in `node_modules` (Node stays the runtime).

**`deno.json` Tasks** (run via `deno task <name>`):

- `dev` - `node ./node_modules/next/dist/bin/next dev` (Turbopack)
- `build` - `node ./node_modules/next/dist/bin/next build` (Turbopack) + `copy-deploy-migrations.mjs`
- `start` - `node ./node_modules/next/dist/bin/next start`
- `lint` - `node ./node_modules/eslint/bin/eslint.js .`
- `typecheck` - `node ./node_modules/typescript/bin/tsc --noEmit`
- `db:generate` - `node ./node_modules/drizzle-kit/bin.cjs generate`
- `db:migrate` - `node ./node_modules/drizzle-kit/bin.cjs migrate`
- `db:push` - `node ./node_modules/drizzle-kit/bin.cjs push`
- `db:studio` - `node ./node_modules/drizzle-kit/bin.cjs studio`
- `db:seed` - `node ./node_modules/tsx/dist/cli.mjs src/db/seed.ts` (loads `.env` itself via `dotenv/config`)
- `db:deploy` - `deno run -A --env-file=.env ./migrate.ts` (local only). On Deno Deploy, migrations run at Next boot via `instrumentation.ts` (no predeploy — the partition lacks node_modules and .next access).
- `deploy` - `deployctl deploy --include=.next --include=public jsr:@deno/nextjs-start/v16`

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

**Purpose**: Next.js configuration for Deno Deploy + local Turbopack

- `output: "standalone"` — Deno Deploy / `next start`
- `outputFileTracingRoot` / `outputFileTracingIncludes` — pin package root; include `drizzle/**/*` for boot migrations
- `serverExternalPackages`: `web-push`, `pusher`, `bcryptjs`, `pg`
- `turbopack.resolveAlias` — pin `tailwindcss` / `@tailwindcss/postcss` (avoid parent `package-lock.json` workspace-root bug)
- **No** `--webpack` / no server `splitChunks: false` — prod uses default Turbopack (webpack shared-chunk collect broke on Deno Deploy; self-contained webpack OOMd under 3GB build limit)

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
