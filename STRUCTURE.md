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
├── package.json            # NPM scripts & dependencies
├── package-lock.json       # NPM lockfile
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
│   ├── dashboard/
│   │   ├── layout.tsx      # Dashboard layout (auth + sidebar)
│   │   ├── page.tsx        # Dashboard home
│   │   ├── activity/
│   │   │   └── page.tsx    # Activity log page
│   │   ├── admin/
│   │   │   ├── page.tsx    # Admin page (server)
│   │   │   └── AdminClient.tsx  # Admin client component
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
│   └── api/                # API Routes (REST)
│       ├── auth/
│       │   ├── login/route.ts      # POST - Login
│       │   ├── logout/route.ts     # POST - Logout
│       │   └── me/route.ts         # GET - Current user
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
│       │   └── route.ts            # GET, POST - Task comments
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
└── lib/                    # Utilities
    ├── api.ts              # API client helpers
    └── auth.ts             # Authentication utilities
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

### `src/app/dashboard/layout.tsx`

**Purpose**: Protected dashboard layout with sidebar
**Exports**: `DashboardLayout({ children })` - Server component

- Validates session via `getSession()`
- Redirects to `/login` if unauthenticated
- Renders `Sidebar` with user info

### `src/app/dashboard/page.tsx`

**Purpose**: Dashboard home page
**Exports**: `DashboardPage()` - Server component

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

**Purpose**: Kanban board with columns (Backlog, Todo, In Progress, Review, Done)
**Exports**: `KanbanBoard({ projectId, tasks, users })` - Client component

- Drag-and-drop (react-dnd or native)
- Task cards with priority, assignee, due date

### `src/app/dashboard/projects/[id]/TaskDetailModal.tsx`

**Purpose**: Modal for task details (description, comments, activity)
**Exports**: `TaskDetailModal({ task, onClose })` - Client component

- Rich text editor for description
- Comments section
- Activity timeline

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

---

### API Routes

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
- `vercel:build` - `npm run db:generate && next build`
- `vercel:deploy` - `npm run db:migrate && vercel --prod`

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
