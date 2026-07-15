# Vellum (Vellum)

A modern team management platform with Kanban boards, task tracking, and real-time collaboration. Built with Next.js 15, PostgreSQL, and Drizzle ORM.

## 🎯 Why Vellum?

Most team management tools fall into the same traps: they're **expensive**, **bloated with features you never use**, or have **free tiers so limited** you hit paywalls for basic needs. Self-hosted alternatives often require a DevOps team just to keep running, and open-source options can be so complicated to develop or extend that you spend more time fighting the codebase than shipping work.

Vellum was built to be different:
- **Simple by default** — clean, intuitive interface that stays out of your way
- **Powerful when you need it** — advanced features are there, but only when you want them
- **Easy to extend** — well-documented codebase designed for fast iteration
- **Truly open** — no artificial limits, no surprise paywalls

## 📖 Our Story

Like many teams, we tried everything: Jira, Trello, and a long list of others. We even settled on Vikunja for a while — it was simple and great for its use case. But eventually we found ourselves duct-taping multiple tools together, struggling with self-hosting costs, and hitting walls whenever we needed to customize or add features.

We needed something **simple yet powerful**, **robust yet customizable**, something we could extend without a PhD in the codebase. So we started Vellum — using AI agents to ship fast for our own team.

Then we realized: *we're not the only ones facing this*. Whether you're a small team, a growing startup, or part of a larger community, you might need the same thing. So we open-sourced it.

Vellum grows every day with new features, but we stay committed to the original vision: **keep it simple and straightforward**. Features shouldn't get in your way unless you need them — and when you do, they're right there, easy to find and use.

## 📜 Name & Meaning

**Vellum** is prepared animal skin or membrane, historically used as a premium writing material — smooth, durable, and designed to last. We chose the name because it reflects what we believe about great team workflows: they should be **clear**, **organized**, and **timeless**.

Just as vellum was the foundation for manuscripts, scrolls, and codices that preserved knowledge for centuries, Vellum aims to be the reliable foundation for how teams organize and ship their work.

_Read more about the historical material on [Wikipedia](https://en.wikipedia.org/wiki/Vellum)._

## 🗺️ Roadmap

Vellum is actively developed. See [TODO.md](TODO.md) for planned features and upcoming improvements, and [DONE.md](DONE.md) for what's already shipped.

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
| Package Manager | bun (bun.lock present)                       |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or Neon)
- bun

### Installation

```bash
# Clone and install
git clone <repo-url>
cd Vellum
bun install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and DIRECT_DATABASE_URL

# Database setup
bun run db:generate  # Generate migrations from schema
bun run db:migrate   # Apply migrations
bun run db:seed      # Seed demo data (optional)

# Development
bun run dev          # Start dev server at http://localhost:3000
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
bun run dev              # Start dev server (Turbopack)

# Database
bun run db:generate      # Generate migrations
bun run db:migrate       # Apply migrations
bun run db:push          # Push schema directly (no migration files)
bun run db:studio        # Open Drizzle Studio
bun run db:seed          # Seed full demo data

# Quality
bun run lint             # ESLint
bun run typecheck        # TypeScript check
bun run build            # Production build

# Deploy
bun run vercel:build     # Build with migration generation
bun run vercel:deploy    # Migrate + deploy to Vercel
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
