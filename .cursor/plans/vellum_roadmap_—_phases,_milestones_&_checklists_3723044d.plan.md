---
name: Vellum Roadmap — Phases, Milestones & Checklists
overview: ""
todos: []
isProject: false
---

# Vellum Roadmap — Phases, Milestones & Checklists

Create `ROADMAP.md` at repo root. Group work into product-stage phases. Each milestone carries a checklist whose items reference `TODO.md` (link-refs). Status derived from `TODO.md` `[x]`/unchecked boxes.

## Structure of `ROADMAP.md`

Header + legend (Phase → Milestone → Task, with TODO link + status). Then phases:

### Phase 0 — Infrastructure & Tooling (mostly done)
- Milestone: Package & DB migration (`bun→deno`, `Neon→local PG`) — tracked in `.cursor/plans/...plan.md`, reflected in `AGENTS.md`/`STRUCTURE.md`/`README.md` edits (see git status).
- Checklist: deno.json tasks, package.json scripts removed, seed.ts env load, .env.example local PG, drizzle.config, .gitignore, docs updated.

### Phase 1 — MVP Core (done)
References `[x]` items: optimistic updates, real-time (Pusher), Kanban add-task UX, drag-and-drop, task comments, admin user-creation bug, Kanban dedicated page.
- Milestone: Core collaboration loop working end-to-end.

### Phase 2 — Notifications & Collaboration (pending)
- Milestone: Notification centre + channels.
- Checklist (link TODO items): Notifications bell; Email notifications; Push notifications; Actions without notifications; Activity log for notification decisions.

### Phase 3 — Project & Team Depth (pending)
- Milestone: Richer project/team management.
- Checklist: Project milestones UI; Team management UI; File attachments; Project notes.

### Phase 4 — Super Admin & Governance (partial)
- Milestone: Admin oversight & audit.
- Checklist: Super Admin Parts 3–7 (activity panel, sessions, audit logs, health, role matrix); Audit logging; API rate limiting.

### Phase 5 — UX & Productivity (pending)
- Milestone: Power-user UX.
- Checklist: Search & filters; Dark/light theme; Keyboard shortcuts; Activity feed improvements; Loading states; Error boundaries; Accessibility audit.

### Phase 6 — Integrations & Advanced (pending/ideas)
- Milestone: Extensibility.
- Checklist (New Features ideas): Time tracking; Recurring tasks; Task dependencies; Webhooks; Slack/Discord; Calendar view; Export/Import; i18n; Public project views.

### Phase 7 — Mobile & Reporting (pending)
- Milestone: Mobile + analytics.
- Checklist: Reporting dashboard; Mobile responsive; Mobile-first mode; User profiles.

### Phase 8 — Quality & Hardening (pending)
- Milestone: Production readiness.
- Checklist (Technical Debt): Test suite; TypeScript strictness; Database indexes; (Error boundaries/Loading states cross-listed from P5).

## Cross-sync rule
Each roadmap task line ends with a backlink like `→ TODO.md §"Notifications bell"`. Single source of truth stays `TODO.md`; roadmap is the phase/milestone view. Update both when a task completes.

## Acceptance
- `ROADMAP.md` created at repo root.
- All `TODO.md` unfinished items appear in exactly one milestone.
- Completed `[x]` items grouped under their phase with done status.
- No code changes — docs only.

## Files
- New: `ROADMAP.md`
- Read-only refs: `TODO.md`, `.cursor/plans/migrate_vellum_bun_→_deno_...plan.md`, `AGENTS.md`, `STRUCTURE.md`
