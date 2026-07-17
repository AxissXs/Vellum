# Roadmap — Phases, Milestones & Checklists

Phased view of the work tracked in [`TODO.md`](TODO.md). **Single source of truth is `TODO.md`** — this file is the phase/milestone grouping, and each item links back to its `TODO.md` entry. When a task is completed, tick it in **both** files.

## Legend

- **Phase** — a product-stage grouping (Infra → MVP → Notifications → … → Hardening).
- **Milestone** — a shippable outcome within a phase.
- **Task** — one `TODO.md` item, with a backlink like `→ TODO.md §"Notifications bell"`.
- Status is derived from `TODO.md`: `[x]` done, `[ ]` pending.

| Symbol | Meaning |
| ------ | ------- |
| ✅ | Phase/milestone complete |
| 🔶 | Partially complete (some tasks done) |
| ⬜ | Not started |

---

## Agile Cadence

Phases (P0–P8) are the **roadmap horizon** — a long-term view of what gets built. **Sprints** are the **delivery cadence** that cuts across phases. They are not the same thing: one sprint can touch multiple phases, and one phase can span several sprints.

- Cadence is **customizable per project** (default 2-week sprint; 1-week / 3-week / milestone-based all valid). See [`TODO.md` §"Agile Workflow"](TODO.md) for ceremonies (grooming, planning, standup, retro) and the [Sprints](TODO.md) log.
- Example: Phase 2 (Notifications) + Phase 3 (Project/Team Depth) might be delivered across ~3 sprints.
- **Division of labour:** `ROADMAP.md` = horizon/phases; `TODO.md` = sprint execution + backlog. Single source of truth for task state stays `TODO.md`.

---

## Phase 0 — Infrastructure & Tooling 🔶

**Milestone:** Package manager + database migration (`bun → deno`, `Neon → local PostgreSQL`).

Tracked in [`.cursor/plans/migrate_vellum_bun_→_deno_(package_manager)_+_neon_→_local_postgresql_44a67e5b.plan.md`](.cursor/plans/migrate_vellum_bun_→_deno_(package_manager)_+_neon_→_local_postgresql_44a67e5b.plan.md); reflected in modified `AGENTS.md`, `STRUCTURE.md`, `README.md`, `package.json`, `drizzle.config.ts`, `.gitignore`, new `deno.json` (see git status).

- [x] `deno.json` task definitions (1:1 with old bun scripts)
- [x] `package.json` `scripts` block removed; deps kept
- [x] `src/db/seed.ts` self-loads `.env` via `dotenv/config`
- [x] `.env.example` points at local PostgreSQL
- [x] `drizzle.config.ts` uses `DATABASE_URL` (no `DIRECT_DATABASE_URL`)
- [x] `.gitignore` tracks `deno.lock`, drops `bun.lock`
- [x] Docs updated (`AGENTS.md`, `STRUCTURE.md`, `README.md`, `CONTRIBUTIONS.md`)

---

## Phase 1 — MVP Core ✅

**Milestone:** Core collaboration loop working end-to-end (Kanban + tasks + comments + real-time).

- [x] Optimistic updates everywhere → TODO.md §"Optimistic updates everywhere"
- [x] Real-time updates (Pusher/SSE) → TODO.md §"Real-time updates"
- [x] Kanban Add task button UX fix → TODO.md §"Kanban Add task button UX fix"
- [x] Drag-and-drop Kanban (`@dnd-kit`) → TODO.md §"Drag-and-drop Kanban"
- [x] Task comments (full system) → TODO.md §"Task comments"
- [x] Bug: Admin user creation not reflected in UI → TODO.md §"Bug: Admin user creation not reflected in UI"
- [x] Kanban board as dedicated page/tab → TODO.md §"Kanban board as dedicated page/tab"

---

## Phase 2.5 — Agile Tools ✅

**Milestone:** In-app sprint management with board, burndown, standup, retro, and planning.

- [x] Sprints CRUD + active sprint per project → TODO.md §"Agile tools (sprints, standup, retro, planning)"
- [x] Sprint board (tasks filtered by sprintId) → TODO.md §"Agile tools (sprints, standup, retro, planning)"
- [x] Burndown chart (ideal vs actual from task_status_history) → TODO.md §"Agile tools (sprints, standup, retro, planning)"
- [x] Sprint planning (pull backlog tasks into sprint) → TODO.md §"Agile tools (sprints, standup, retro, planning)"
- [x] Daily standup (upsert per user per day) → TODO.md §"Agile tools (sprints, standup, retro, planning)"
- [x] Sprint retro (went well / went wrong / action items) → TODO.md §"Agile tools (sprints, standup, retro, planning)"

---

## Phase 2 — Notifications & Collaboration ⬜

**Milestone:** In-app notification centre plus email/push channels and notification-control UX.

- [ ] Notifications bell (in-app centre) → TODO.md §"Notifications bell"
- [ ] Email notifications (Resend/SendGrid) → TODO.md §"Email notifications"
- [ ] Push notifications (Web Push/VAPID) → TODO.md §"Push notifications"
- [ ] Actions without notifications (per-action opt-out) → TODO.md §"Actions without notifications"
- [ ] Activity log for notification decisions → TODO.md §"Activity log for notification decisions"

---

## Phase 3 — Project & Team Depth ⬜

**Milestone:** Richer project and team management surface.

- [ ] Project milestones UI (timeline/Gantt, progress) → TODO.md §"Project milestones"
- [ ] Team management UI (invite, roles, settings) → TODO.md §"Team management UI"
- [ ] File attachments (S3/R2/Cloudinary) → TODO.md §"File attachments"
- [ ] Project notes (rich text, version history) → TODO.md §"Project notes"

---

## Phase 4 — Super Admin & Governance 🔶

**Milestone:** Admin oversight, session control, audit trail, and system health.

- [x] Super Admin prerequisites (DB tables + migrations) → TODO.md §"Super Admin Dashboard" (Prerequisites)
- [x] Super Admin Part 1 — Route & sidebar link → TODO.md §"Super Admin Dashboard" (Part 1)
- [x] Super Admin Part 2 — Users management table → TODO.md §"Super Admin Dashboard" (Part 2)
- [ ] Super Admin Part 3 — Real-time activity monitoring → TODO.md §"Super Admin Dashboard" (Part 3)
- [ ] Super Admin Part 4 — Session management → TODO.md §"Super Admin Dashboard" (Part 4)
- [ ] Super Admin Part 5 — Enhanced audit logs → TODO.md §"Super Admin Dashboard" (Part 5)
- [ ] Super Admin Part 6 — System health metrics → TODO.md §"Super Admin Dashboard" (Part 6)
- [ ] Super Admin Part 7 — Role / permission matrix → TODO.md §"Super Admin Dashboard" (Part 7)
- [ ] Audit logging (login attempts, permission changes) → TODO.md §"Audit logging"
- [ ] API rate limiting (per-user/IP) → TODO.md §"API rate limiting"

---

## Phase 5 — UX & Productivity ⬜

**Milestone:** Power-user UX — search, theming, shortcuts, resilience.

- [ ] Search & filters (global, full-text) → TODO.md §"Search & filters"
- [ ] Dark/Light theme toggle → TODO.md §"Dark/Light theme toggle"
- [ ] Keyboard shortcuts → TODO.md §"Keyboard shortcuts"
- [ ] Activity feed improvements (filter/paginate/realtime) → TODO.md §"Activity feed improvements"
- [ ] Loading states (skeleton loaders) → TODO.md §"Loading states"
- [ ] Error boundaries (graceful failures) → TODO.md §"Error boundaries"
- [ ] Accessibility audit (WCAG 2.1 AA) → TODO.md §"Accessibility audit"

---

## Phase 6 — Integrations & Advanced ⬜

**Milestone:** Extensibility and advanced workflows.

- [ ] Time tracking → TODO.md §"Time tracking"
- [ ] Recurring tasks → TODO.md §"Recurring tasks"
- [ ] Task dependencies → TODO.md §"Task dependencies"
- [ ] Webhooks (outgoing) → TODO.md §"Webhooks"
- [ ] Slack/Discord integration → TODO.md §"Slack/Discord integration"
- [x] Calendar view → TODO.md §"Calendar view"
- [ ] Export/Import (JSON/CSV) → TODO.md §"Export/Import"
- [ ] Multi-language (i18n) → TODO.md §"Multi-language (i18n)"
- [ ] Public project views → TODO.md §"Public project views"

---

## Phase 7 — Mobile & Reporting ⬜

**Milestone:** Mobile experience and analytics.

- [ ] Reporting dashboard (velocity, burndown, workload) → TODO.md §"Reporting dashboard"
- [ ] Mobile responsive improvements → TODO.md §"Mobile responsive improvements"
- [ ] Mobile-first limited-feature mode → TODO.md §"Mobile-first limited-feature mode"
- [ ] User profiles (avatar, edit, 2FA) → TODO.md §"User profiles"

---

## Phase 8 — Quality & Hardening ⬜

**Milestone:** Production readiness.

- [ ] Test suite (Vitest + Playwright) → TODO.md §"Add test suite"
- [ ] TypeScript strictness (`noUncheckedIndexedAccess`, etc.) → TODO.md §"TypeScript strictness"
- [ ] Database indexes (composite/partial) → TODO.md §"Database indexes"
- [ ] Loading states (cross-listed Phase 5) → TODO.md §"Loading states"
- [ ] Error boundaries (cross-listed Phase 5) → TODO.md §"Error boundaries"

---

## Coverage Check

Every `TODO.md` item maps to exactly one phase above:

| TODO.md section | Phase |
| --------------- | ----- |
| Optimistic updates everywhere | 1 |
| Real-time updates | 1 |
| Kanban Add task button UX fix | 1 |
| Drag-and-drop Kanban | 1 |
| Task comments | 1 |
| Admin user creation bug | 1 |
| Kanban dedicated page | 1 |
| Agile tools (sprints, standup, retro, planning) | 2.5 |
| Notifications bell | 2 |
| Email notifications | 2 |
| Push notifications | 2 |
| Actions without notifications | 2 |
| Activity log for notification decisions | 2 |
| Project milestones | 3 |
| Team management UI | 3 |
| File attachments | 3 |
| Project notes | 3 |
| Super Admin Dashboard (all parts) | 4 |
| Audit logging | 4 |
| API rate limiting | 4 |
| Search & filters | 5 |
| Dark/Light theme toggle | 5 |
| Keyboard shortcuts | 5 |
| Activity feed improvements | 5 |
| Loading states | 5 / 8 |
| Error boundaries | 5 / 8 |
| Accessibility audit | 5 |
| Time tracking | 6 |
| Recurring tasks | 6 |
| Task dependencies | 6 |
| Webhooks | 6 |
| Slack/Discord integration | 6 |
| Calendar view | 6 |
| Export/Import | 6 |
| Multi-language (i18n) | 6 |
| Public project views | 6 |
| Reporting dashboard | 7 |
| Mobile responsive improvements | 7 |
| Mobile-first limited-feature mode | 7 |
| User profiles | 7 |
| Add test suite | 8 |
| TypeScript strictness | 8 |
| Database indexes | 8 |

Infrastructure migration (Phase 0) is tracked in the plan file / git status, not as a `TODO.md` checkbox.

---

## Sprint ↔ Phase Mapping

Template mapping — edit as sprints are planned. Shows which phases a sprint touches. Cadence customizable (see [Agile Cadence](#agile-cadence)).

| Sprint | Goal (one line) | Phases touched |
| ------ | --------------- | -------------- |
| Sprint 1 | <goal> | P0, P1 |
| Sprint 2 | <goal> | P1, P2 |
| Sprint 3 | <goal> | P2, P3 |
| Sprint 4 | <goal> | P3, P4 |
| Sprint 5 | <goal> | P4, P5 |
| Sprint 6 | <goal> | P5, P6 |
| Sprint 7 | <goal> | P6, P7 |
| Sprint 8 | <goal> | P7, P8 |
| Sprint N | <goal> | <phases> |

Execution detail (task checklist, retro) lives in [`TODO.md` §"Sprints"](TODO.md).
