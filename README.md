# Vellum (product brand: Perfect)

A modern team management platform with Kanban boards, task tracking, and real-time collaboration. Built with Next.js 15, PostgreSQL, and Drizzle ORM.

**Whitelabel:** product name, logos, colors, and email domain live in [`src/lib/brand.ts`](src/lib/brand.ts) (overridable via `NEXT_PUBLIC_BRAND_*`). Defaults ship as **Perfect**.


## 🌟 Features

- **Kanban Boards** - Visual project management with drag-and-drop tasks
- **Role-based Access** - Superadmin, Admin, and Member roles
- **Teams & Projects** - Organize work with teams and projects
- **Task Management** - Priorities, statuses, assignees, due dates, comments
- **Activity Logging** - Full audit trail of all actions
- **Dashboard Analytics** - Velocity, completion rates, workload insights
- **Real-time Ready** - Architecture supports WebSocket/SSE integration

## 🛠 Tech Stack

| Category        | Technology                                   |
| --------------- | -------------------------------------------- |
| Framework       | Next.js 16 (App Router, React 19, Turbopack) |
| Database        | PostgreSQL (local) with Drizzle ORM 0.45     |
| Auth            | Custom session-based with bcryptjs           |
| Styling         | Tailwind CSS 4                               |
| Language        | TypeScript 5.9                               |
| Package Manager | deno (deno.json tasks; deps in package.json) |

## 🚀 Quick Start

### Prerequisites

- Deno 2+
- Node.js 20+ (runtime for Next.js/Drizzle)
- Local PostgreSQL (v13+; `gen_random_uuid()` needs PG 13+ or the `pgcrypto` extension)

### Installation

```bash
# Clone and install
git clone <repo-url>
cd Vellum
deno install

# Configure environment
cp .env.example .env
# Edit .env with your local DATABASE_URL

# Database setup
deno task db:generate  # Generate migrations from schema
deno task db:push      # Push schema to fresh local DB (or db:migrate)
deno task db:seed      # Seed demo data (optional)

# Development
deno task dev          # Start dev server at http://localhost:3000
```

### Demo Accounts (after seeding)

| Role       | Email                                                                                        | Password    |
| ---------- | -------------------------------------------------------------------------------------------- | ----------- |
| Superadmin | alex@perfect.my                                                                              | password123 |
| Admin      | sarah@perfect.my / lisa@perfect.my                                                           | password123 |
| Member     | marcus@perfect.my / emily@perfect.my / david@perfect.my / james@perfect.my / anna@perfect.my | password123 |

## 📁 Project Structure

```
Vellum/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Protected dashboard pages
│   │   ├── login/        # Login page
│   │   └── page.tsx      # Home (redirects)
│   ├── components/       # React components
│   ├── db/               # Database layer
│   │   ├── schema.ts     # Drizzle schema
│   │   ├── seed.ts       # Full demo data
│   │   └── bootstrap.ts  # Auto-seed on first request
│   └── lib/              # Utilities (auth, api)
├── drizzle/              # Migrations (committed)
├── drizzle.config.ts     # Drizzle Kit config
└── package.json
```

See [STRUCTURE.md](STRUCTURE.md) for detailed file breakdown.

## 🤖 AI-Assisted Development

This project is **primarily developed by AI agents** with human review and oversight.

### How It Works

1. **AI Agents** implement features, fix bugs, write tests, and create documentation
2. **Humans** review PRs, approve architectural decisions, and merge
3. **Documentation** (AGENTS.md, STRUCTURE.md, TODO.md) guides agents

### For AI Agents

Start with [AGENTS.md](AGENTS.md) - it contains:

- Project overview and tech stack
- Key commands and workflows
- Code conventions and patterns
- Database and API references
- Commit message format
- Task execution workflow

### For Human Contributors

See [CONTRIBUTIONS.md](CONTRIBUTIONS.md) for:

- How to submit issues and PRs
- Code review process
- Development setup
- Testing requirements

## 📝 Available Scripts

All commands run via `deno task <name>` (Deno invokes the Node binaries in `node_modules`; Node is still the runtime).

```bash
# Development
deno task dev              # Start dev server (Turbopack)

# Database
deno task db:generate      # Generate migrations
deno task db:migrate       # Apply migrations
deno task db:push          # Push schema directly (no migration files)
deno task db:studio        # Open Drizzle Studio
deno task db:seed          # Seed full demo data

# Quality
deno task lint             # ESLint
deno task typecheck        # TypeScript check
deno task build            # Production build

# Deploy
deno task build            # Production build (+ copy migrate/drizzle into public/deploy)
deno task deploy           # CLI deploy via deployctl (GitHub integration preferred)
deno task db:deploy        # Run migrations against DATABASE_URL
```

## 🌐 Deployment (Deno Deploy)

Vellum deploys to **Deno Deploy** with managed **Prisma Postgres**. See [AGENTS.md](AGENTS.md) for the full checklist.

1. Create a Deno Deploy project and link the GitHub repo (Next.js is auto-detected).
2. Provision Prisma Postgres and assign it to the app (`DATABASE_URL` is injected — do not set it manually in prod).
3. Add env vars: `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`.
4. Pre-deploy command (in `deno.json`): `deno run -A public/deploy/migrate.ts`.

Do **not** set `runtime = "edge"` on routes — `pg` needs the Node runtime.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTIONS.md](CONTRIBUTIONS.md) for guidelines.

### Quick Links

- [Report a Bug](https://github.com/AxissXs/Vellum/issues/new?template=bug_report.md)
- [Request a Feature](https://github.com/AxissXs/Vellum/issues/new?template=feature_request.md)
- [View TODO](TODO.md) - Planned improvements and features
- [Agent Instructions](AGENTS.md) - For AI contributors
