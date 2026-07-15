# Contributing

Thank you for your interest in contributing! This project is built with AI assistance and human review. All contributions are welcome.

## Code of Conduct

By participating, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** - Search [GitHub Issues](https://github.com/AxissXs/Vellum/issues) first
2. **Create a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, Node version, browser)
   - Screenshots if applicable
3. **Label** - Add `bug` label

### Suggesting Features

1. **Check existing issues/PRs** - Avoid duplicates
2. **Create an issue** with:
   - Clear title starting with `feat:`
   - Detailed description of the feature
   - Use cases / user stories
   - Mockups or diagrams if helpful
3. **Label** - Add `enhancement` label

### Working on TODO Items

1. Check [TODO.md](TODO.md) for available tasks
2. Pick a task with `status: pending` and `priority: high` or `medium`
3. Comment on the issue to claim it
4. Follow the development workflow below

## Development Workflow

### 1. Setup

```bash
# Fork and clone
git clone https://github.com/your-fork/Vellum.git
cd Vellum

# Install dependencies
deno install

# Set up environment
cp .env.example .env
# Edit .env with your local DATABASE_URL

# Run migrations and seed
deno task db:push      # fresh local DB (or db:migrate)
deno task db:seed

# Start dev server
deno task dev
```

### 2. Create a Branch

```bash
git checkout -b type/short-description
# Examples:
# feat/kanban-drag-drop
# fix/auth-session-expiry
# docs/api-documentation
```

Branch naming convention:

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `refactor/` - Code restructuring
- `test/` - Adding tests
- `chore/` - Maintenance tasks

### 3. Make Changes

Follow the conventions in [AGENTS.md](AGENTS.md):

- Match existing code style
- Write TypeScript with proper types
- Add/Update tests if applicable
- Update documentation if needed

### 4. Quality Checks

Run before committing:

```bash
deno task lint        # ESLint
deno task typecheck   # TypeScript
deno task build       # Production build
```

All checks must pass. CI will run these on PR.

### 5. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add -A
git commit -m "type(scope): description

[optional body]

[optional footer]"
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `db`

Examples:

```
feat(kanban): add drag-and-drop task reordering
fix(auth): handle expired session cleanup on login
docs(api): add OpenAPI spec for tasks endpoint
db: add project_milestones table
```

### 6. Push and Create PR

```bash
git push origin your-branch-name
```

Open a Pull Request with:

- **Title**: Same as commit message (or summary for multiple commits)
- **Description**:
  - What changes were made
  - Why (link to issue)
  - Testing done
  - Screenshots for UI changes
- **Labels**: Appropriate labels (`feat`, `fix`, etc.)

## Pull Request Guidelines

### PR Requirements

- [ ] Linked to an issue (bug fixes **require** an issue)
- [ ] All CI checks pass (lint, typecheck, build)
- [ ] No merge conflicts
- [ ] Meaningful commit history (squash if needed)
- [ ] Documentation updated if needed

### For Bug Fixes

**Must have an associated issue** created before the PR. The issue should:

- Describe the bug clearly
- Include reproduction steps
- Have the `bug` label

### For Features

**Should have an associated issue** with:

- Feature description
- Acceptance criteria
- Design/discussion if significant
- The `enhancement` label

### Review Process

1. **Automated checks** run (lint, typecheck, build)
2. **Human review** - At least one maintainer approves
3. **AI review** - Optional AI-assisted code review
4. **Merge** - Squash and merge by maintainer

## Code Style

### TypeScript

- Strict mode enabled
- Prefer `type` over `interface` for unions
- Use `const` assertions for literal types
- Avoid `any` - use `unknown` or proper types

### React/Next.js

- Server Components by default
- `"use client"` only when needed
- Colocate components with routes
- Use `@/` path alias for imports

### Database (Drizzle)

- Modify `src/db/schema.ts`
- Run `deno task db:generate` for migrations
- Commit both schema and migration files
- Use snake_case for columns, camelCase for TS

### Styling (Tailwind)

- Use utility classes
- Custom colors in `globals.css` via CSS variables
- Responsive: `mobile-first` approach
- Dark mode via `.dark` class (not media query)

### Naming

| Type             | Convention                                   |
| ---------------- | -------------------------------------------- |
| Components       | PascalCase (`KanbanBoard.tsx`)               |
| Functions        | camelCase (`getSession`)                     |
| Constants        | UPPER_SNAKE_CASE (`SESSION_MAX_AGE`)         |
| Types/Interfaces | PascalCase (`AuthUser`)                      |
| Files            | PascalCase (components), kebab-case (routes) |

## Testing

Currently no test framework configured. When adding tests:

- Use Vitest for unit tests
- Use Playwright for E2E tests
- Place tests in `__tests__/` or `*.test.ts`

## Documentation

Update relevant docs when changing:

- `README.md` - Overview, setup, scripts
- `AGENTS.md` - AI agent instructions
- `STRUCTURE.md` - File structure
- `TODO.md` - Task list
- Code comments (only when necessary)

## Questions?

- Open a [Discussion](https://github.com/AxissXs/Vellum/discussions)
- Check existing issues/PRs
- Tag maintainers in PRs

## Recognition

Contributors are recognized in:

- GitHub contributors graph
- Release notes
- README acknowledgments (for significant contributions)

Thank you for contributing to Vellum! 🍵
