# Vellum (Vellum)

A modern team management platform with Kanban boards, task tracking, and real-time collaboration. Built with Next.js 15, PostgreSQL, and Drizzle ORM.

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
| Database        | PostgreSQL (Neon) with Drizzle ORM 0.45      |
| Auth            | Custom session-based with bcryptjs           |
| Styling         | Tailwind CSS 4                               |
| Language        | TypeScript 5.9                               |
| Package Manager | npm (bun.lock present)                       |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or Neon)
- npm or bun

### Installation

```bash
# Clone and install
git clone <repo-url>
cd Vellum
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and DIRECT_DATABASE_URL

# Database setup
npm run db:generate  # Generate migrations from schema
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed demo data (optional)

# Development
npm run dev          # Start dev server at http://localhost:3000
```

### Demo Accounts (after seeding)

| Role       | Email                                                                                        | Password    |
| ---------- | -------------------------------------------------------------------------------------------- | ----------- |
| Superadmin | alex@vellum.app                                                                              | password123 |
| Admin      | sarah@vellum.app / lisa@vellum.app                                                           | password123 |
| Member     | marcus@vellum.app / emily@vellum.app / david@vellum.app / james@vellum.app / anna@vellum.app | password123 |

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

```bash
# Development
npm run dev              # Start dev server (Turbopack)

# Database
npm run db:generate      # Generate migrations
npm run db:migrate       # Apply migrations
npm run db:push          # Push schema directly (no migration files)
npm run db:studio        # Open Drizzle Studio
npm run db:seed          # Seed full demo data

# Quality
npm run lint             # ESLint
npm run typecheck        # TypeScript check
npm run build            # Production build

# Deploy
npm run vercel:build     # Build with migration generation
npm run vercel:deploy    # Migrate + deploy to Vercel
```

## 🌐 Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables:
   - `DATABASE_URL` - Pooled connection string
   - `DIRECT_DATABASE_URL` - Direct connection string
4. Deploy (uses `vercel:build` script)

Migrations run automatically during build via `vercel:build`.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTIONS.md](CONTRIBUTIONS.md) for guidelines.

### Quick Links

- [Report a Bug](https://github.com/AxissXs/Vellum/issues/new?template=bug_report.md)
- [Request a Feature](https://github.com/AxissXs/Vellum/issues/new?template=feature_request.md)
- [View TODO](TODO.md) - Planned improvements and features
- [Agent Instructions](AGENTS.md) - For AI contributors
