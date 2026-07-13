---
name: Add Agile Method (Sprints + Tasks + Retro + Standup) to Vellum Docs
overview: ""
todos: []
isProject: false
---

# Add Agile Method (Sprints + Tasks + Retro + Standup) to Vellum Docs

Fold agile methodology into existing [`TODO.md`](TODO.md) and [`ROADMAP.md`](ROADMAP.md). No new files. Cadence is customizable per project (template values, not hardcoded).

## 1. Extend TODO.md

Add agile sections without disturbing existing priority buckets.

### a. "## Agile Workflow" section (new, near top after intro/before Priority buckets)
- **Cadence (customizable):** default 2-week sprint; set per project in `SPRINT_CURRENT`. Sprint length, grooming day, retro day are project variables, not fixed.
- **Ceremonies:**
  - Backlog grooming — refine/prioritize TODO items; move ideas → priority buckets.
  - Sprint planning — pull top-priority `[ ]` items into current sprint; tag `status: in_progress`.
  - Daily standup — 3 questions (done/yesterday/blockers); no doc churn, just status sync.
  - Sprint retro — append to `retro/` log; what went well / wrong / actions.
- **Task lifecycle:** `pending` → `in_progress` → `review` → `done`. Map existing status tags to this.

### b. Sprint tracking block (new "## Sprints" section, after Priority buckets / before Technical Debt)
```
## Sprints
- **Sprint N (YYYY-MM-DD → YYYY-MM-DD)** — goal: <one line>
  - [ ] TODO.md §"Item" (status: in_progress)
  - [x] TODO.md §"Item" (done)
  - Retro: [retro/sprint-N.md](retro/sprint-n.md)
```
Keep a `SPRINT_CURRENT` pointer line at top of section.

### c. Retro log dir convention
- Add `retro/` folder note (markdown files, one per sprint). Cadence = end of each sprint (customizable).

## 2. Extend ROADMAP.md

### a. Add "## Agile Cadence" subsection (after Legend, before Phase 0)
- Explain phases ≠ sprints. Phases = roadmap horizon; sprints = delivery cadence cutting across phases.
- Cadence customizable; example: Phase 2–3 span ~3 sprints.
- Link to `TODO.md §"Agile Workflow"`.

### b. Add sprint-mapping table (new "## Sprint ↔ Phase Mapping" section, after Coverage Check)
- Map each phase (P0–P8) to suggested sprint windows (template, editable). Shows which phases a sprint touches.

### c. Cross-sync note
- ROADMAP = horizon/phases; TODO = sprint execution + backlog. Single source of truth for task state stays TODO.md.

## 3. Acceptance
- `TODO.md` has Agile Workflow + Sprints + retro convention; existing buckets untouched.
- `ROADMAP.md` has Agile Cadence + Sprint↔Phase mapping; existing phases untouched.
- Cadence stated as customizable, not hardcoded.
- No code changes. retro/ dir created only as convention note (no file written unless user wants seed retro).

## Files
- Edit: [`TODO.md`](TODO.md)
- Edit: [`ROADMAP.md`](ROADMAP.md)
- Reference: existing priority buckets, status tags, ROADMAP phases P0–P8.
