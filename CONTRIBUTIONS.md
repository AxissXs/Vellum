# Contributing to Vellum

Thanks for your interest! Whether you're fixing a bug or adding a feature, this guide covers everything you need.

## Quick Start

```bash
git clone https://github.com/AxissXs/Vellum.git
cd Vellum && bun install
cp .env.example .env
# Add your DATABASE_URL and DIRECT_DATABASE_URL
bun run db:migrate && bun run db:seed && bun run dev
```

## Workflow

### 1. Find or Create an Issue
- Check [TODO.md](TODO.md) for planned work and [DONE.md](DONE.md) for what's shipped
- Search existing [issues](https://github.com/AxissXs/Vellum/issues) before creating new ones
- Comment to claim an issue before starting work

### 2. Create a Branch
```bash
git checkout -b type/description
# feat/login-with-oauth  fix/auth-redirect  docs/api-errors
```

### 3. Make Your Changes

**Code conventions:**
- **TypeScript**: strict mode, prefer `type` over `interface`, no `any`
- **React/Next.js**: Server Components by default, `'use client'` only for interactivity, `@/` imports
- **Database (Drizzle)**: edit `src/db/schema.ts`, run `bun run db:generate`, commit both files
- **Tailwind**: utility classes, mobile-first, dark mode via `.dark` class

**Naming:**
| Type | Convention |
|------|-----------|
| Components | PascalCase (`KanbanBoard.tsx`) |
| Functions | camelCase (`getSession`) |
| Constants | UPPER_SNAKE_CASE |
| Route files | kebab-case (`route.ts`) |

**Activity logging:** All mutating API routes must write to `activity_logs` after success.

**Optimistic updates:** All mutations must use the full pattern (`onMutate` → `onError` rollback + toast → `onSuccess` → `onSettled` invalidate). See `src/hooks/useComments.ts` for the reference.

### 4. Run Quality Checks
```bash
bun run lint       # ESLint
bun run typecheck  # tsc --noEmit
bun run build      # production build
```
All three must pass before committing.

### 5. Commit and Push
```bash
git add . && git commit -m "type(scope): description"
# feat(kanban): add drag-and-drop task reordering
# fix(auth): handle expired session cleanup on login
# db: add project_milestones table
git push origin your-branch-name
```

Commit types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `db`

### 6. Open a Pull Request

- Link the related issue
- Describe what changed and why
- Include screenshots for UI changes
- All quality checks must pass (CI runs `lint` → `typecheck` → `build`)

**PR requirements:**
- [ ] Linked to an issue (required for bug fixes)
- [ ] All checks pass
- [ ] No merge conflicts
- [ ] Documentation updated if needed

## Review & Merge

1. Automated checks run on your PR
2. A maintainer reviews and approves
3. Maintainer squashes and merges to `dev`

`master` branch is protected — all work goes through `dev` first.

## Documentation

Update these when your changes affect:
- `README.md` — setup, features, or project info
- `STRUCTURE.md` — file structure, API routes, component additions
- `TODO.md` / `DONE.md` — task status
- `AGENTS.md` — only if conventions or workflow change

## Questions?

- [GitHub Discussions](https://github.com/AxissXs/Vellum/discussions)
- Open an issue with the `question` label
