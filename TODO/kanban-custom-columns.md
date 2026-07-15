# Customizable Kanban Board Columns

> **Priority:** High
> **Status:** Pending
> **Estimated complexity:** Large
> **Depends on:** Nothing

---

## Overview

Replace the hardcoded 5-column kanban board with a flexible, per-project customizable column system. Columns can be created, edited, deleted, and reordered. Each project can have its own set of columns. The global kanban board uses default columns. Also extract shared kanban components to eliminate code duplication.

## Current State

### Database
- `tasks.status` uses PostgreSQL enum `task_status` with 5 values: `backlog`, `todo`, `in_progress`, `review`, `done` (`src/db/schema.ts:22-28`)
- `tasks.status` default is `"todo"` (line 130)
- No board column configuration table exists

### Hardcoded Columns (duplicated 4 times)
The same `statusColumns` array is copy-pasted in 4 files:

```ts
const statusColumns = [
  { key: "backlog",    label: "Backlog",     color: "bg-slate-500" },
  { key: "todo",       label: "To Do",       color: "bg-blue-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { key: "review",     label: "Review",      color: "bg-purple-500" },
  { key: "done",       label: "Done",        color: "bg-emerald-500" },
];
```

| File | Line | Context |
|------|------|---------|
| `src/app/dashboard/kanban/page.tsx` | 9-15 | Server-side grouping (global board) |
| `src/app/dashboard/kanban/KanbanBoardClient.tsx` | 64-70 | Client-side rendering (global board) |
| `src/app/dashboard/projects/[id]/page.tsx` | 11-17 | Server-side grouping (project board) |
| `src/app/dashboard/projects/[id]/KanbanBoard.tsx` | 53-59 | Client-side rendering (project board) |

### Also duplicated:
- `Task` type definition (identical in both KanbanBoardClient files)
- `Column` type: `{ key: string; label: string; color: string; tasks: Task[] }`
- `priorityColors` and `priorityBadges` maps
- `TaskCard` component (function defined locally in each file)
- DndContext + SortableContext setup and drag handlers

### Board Architecture
- **Global kanban** (`/dashboard/kanban`): Server component fetches ALL tasks, groups by hardcoded status, passes to `KanbanBoardClient`. Client has project filter + search.
- **Project kanban** (`/dashboard/projects/[id]`): Server component fetches tasks for one project, groups by hardcoded status, passes to `KanbanBoard`. Simpler, no filters.
- Both use `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop.
- Drag across columns → updates `tasks.status`. Reorder within column → updates `tasks.position`.

### Files Involved

| File | Lines | Role |
|------|-------|------|
| `src/app/dashboard/kanban/page.tsx` | 76 | Global kanban server component |
| `src/app/dashboard/kanban/KanbanBoardClient.tsx` | 587 | Global kanban client (DnD, filtering, task creation) |
| `src/app/dashboard/projects/[id]/page.tsx` | 166 | Project detail server component |
| `src/app/dashboard/projects/[id]/KanbanBoard.tsx` | 494 | Project kanban client (DnD, task creation) |
| `src/app/dashboard/projects/[id]/TaskDetailModal.tsx` | — | Task edit modal (status dropdown) |
| `src/hooks/useTasks.ts` | — | React Query mutations (create, update, delete, reorder) |
| `src/app/api/tasks/route.ts` | — | Task list/create API |
| `src/app/api/tasks/[id]/route.ts` | — | Task update/delete API |

---

## Database Changes

### New table: `boardColumns`
```ts
export const boardColumns = pgTable("board_columns", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  key: text("key").notNull(),
  color: text("color").notNull(),
  position: text("position").default("0").notNull(),
  isDeletable: boolean("is_deletable").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectKeyUnique: unique("board_columns_project_id_key_unique").on(table.projectId, table.key),
}));
```

**Key design decisions:**
- `projectId` is nullable: `null` = global default columns (used by global kanban page)
- Each project gets its own copy of columns (created on project creation or via seed)
- `key` maps directly to `tasks.status` value (now text, not enum)
- `isDeletable`: false for default columns that came with the seed, true for user-created ones
- Unique constraint on `(projectId, key)` — no duplicate keys per project

### Modified: `tasks.status`
- Change from `taskStatusEnum("status")` to `text("status").notNull().default("todo")`
- Now stores whatever column key the task is in — completely dynamic

### Remove: `taskStatusEnum`
- Delete the pgEnum definition at `src/db/schema.ts:22-28`

---

## Seed Data

### Global Default Columns (`projectId: null`)
| key | name | color | position | isDeletable |
|-----|------|-------|----------|-------------|
| `backlog` | Backlog | `bg-slate-500` | 0 | false |
| `todo` | To Do | `bg-blue-500` | 1 | false |
| `in_progress` | In Progress | `bg-amber-500` | 2 | false |
| `review` | Review | `bg-purple-500` | 3 | false |
| `done` | Done | `bg-emerald-500` | 4 | false |

### Per-Project Columns
When a new project is created (API route `POST /api/projects`), copy global defaults to that project's `boardColumns` rows. Existing projects get columns via seed migration.

---

## API Routes

### Board Columns

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `GET` | `/api/projects/[id]/columns` | Get columns for project | requireAuth |
| `POST` | `/api/projects/[id]/columns` | Create column | requirePermission('edit_projects') |
| `PATCH` | `/api/projects/[id]/columns/[columnId]` | Update column (name, color) | requirePermission('edit_projects') |
| `DELETE` | `/api/projects/[id]/columns/[columnId]` | Delete column (must reassign tasks first) | requirePermission('delete_projects') |
| `PATCH` | `/api/projects/[id]/columns/reorder` | Batch reorder columns | requirePermission('edit_projects') |

**POST body:**
```json
{ "name": "Blocked", "key": "blocked", "color": "bg-red-500" }
```

**DELETE constraints:**
- Cannot delete if tasks exist in this column (must move them first)
- Cannot delete if `isDeletable: false`
- At least one column must remain

**PATCH reorder body:**
```json
{ "columnIds": ["uuid1", "uuid2", "uuid3"] }
```

### Global Defaults

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `GET` | `/api/board-columns/defaults` | Get global default columns | requireAuth |

### Updated Project Creation

`POST /api/projects` — After creating the project, copy global default columns:
```ts
const defaults = await db.select().from(boardColumns).where(isNull(boardColumns.projectId));
await db.insert(boardColumns).values(
  defaults.map(d => ({ ...d, id: crypto.randomUUID(), projectId: project.id }))
);
```

---

## Shared Components (extract from duplication)

### New files to create

| File | Purpose |
|------|---------|
| `src/lib/kanban-utils.ts` | Shared types (`Task`, `Column`, `BoardColumn`), default columns constant, priority colors/badges, utility functions |
| `src/components/kanban/BoardColumn.tsx` | Column wrapper with header, task list, and add-task form |
| `src/components/kanban/TaskCard.tsx` | Draggable task card with priority stripe, assignee, due date |
| `src/components/kanban/ColumnHeader.tsx` | Column header with task count, column menu trigger |
| `src/components/kanban/ColumnMenu.tsx` | Dropdown menu: rename, change color, delete column |
| `src/components/kanban/AddColumnForm.tsx` | Inline form to create a new column |
| `src/components/kanban/ColumnColorPicker.tsx` | Color picker for column colors |

### `src/lib/kanban-utils.ts`
```ts
export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  position: string;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  projectName?: string | null;
  projectColor?: string | null;
};

export type BoardColumn = {
  id: string;
  projectId: string | null;
  name: string;
  key: string;
  color: string;
  position: string;
  isDeletable: boolean;
};

export type Column = {
  key: string;
  label: string;
  color: string;
  tasks: Task[];
};

export const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: "default-backlog", projectId: null, name: "Backlog", key: "backlog", color: "bg-slate-500", position: "0", isDeletable: false },
  { id: "default-todo", projectId: null, name: "To Do", key: "todo", color: "bg-blue-500", position: "1", isDeletable: false },
  { id: "default-in_progress", projectId: null, name: "In Progress", key: "in_progress", color: "bg-amber-500", position: "2", isDeletable: false },
  { id: "default-review", projectId: null, name: "Review", key: "review", color: "bg-purple-500", position: "3", isDeletable: false },
  { id: "default-done", projectId: null, name: "Done", key: "done", color: "bg-emerald-500", position: "4", isDeletable: false },
];

export const priorityColors: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-500",
  low: "border-l-emerald-500",
};

export const priorityBadges: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400",
  high: "bg-orange-500/10 text-orange-400",
  medium: "bg-amber-500/10 text-amber-400",
  low: "bg-emerald-500/10 text-emerald-400",
};

export const COLUMN_COLORS = [
  "bg-slate-500", "bg-blue-500", "bg-amber-500", "bg-purple-500",
  "bg-emerald-500", "bg-red-500", "bg-pink-500", "bg-cyan-500",
  "bg-orange-500", "bg-teal-500", "bg-indigo-500", "bg-yellow-500",
];

export function groupTasksByColumns(tasks: Task[], columns: BoardColumn[]): Column[] {
  return columns.map(col => ({
    key: col.key,
    label: col.name,
    color: col.color,
    tasks: tasks.filter(t => t.status === col.key),
  }));
}
```

### Shared `TaskCard` component
Extract from both `KanbanBoardClient.tsx` and `KanbanBoard.tsx` into `src/components/kanban/TaskCard.tsx`. Uses `useSortable` from dnd-kit. Props: `task`, `onOpenDetail`.

### Shared drag handler logic
Extract the `handleDragStart`, `handleDragOver`, `handleDragEnd` logic into a custom hook or utility. The logic is identical between both boards except for filtering.

---

## UI Changes

### Board Header (per-project kanban)
Add a "Customize Columns" button in the board header area. Opens a panel/modal:
- List of current columns with drag handles for reordering
- Edit button per column (rename, change color)
- Delete button per column (disabled for non-deletable, greyed if tasks exist)
- "Add Column" form at the bottom

### Column Header
- Show column name + task count (already exists)
- `⋯` menu button (right side) → ColumnMenu dropdown
- Menu options: "Rename", "Change Color", "Delete" (if deletable and empty)

### Add Column Inline
- `+ Add Column` button at the end of the column row (after last column)
- Clicking reveals an inline form: name input, color picker, key auto-generated from name
- Submit creates the column via API and adds it to local state

### Column Color Picker
- Grid of predefined colors (Tailwind classes mapped to hex for display)
- Current color highlighted
- Click to select

### Delete Column Flow
1. Click delete on column menu
2. If column has tasks: prompt "Move tasks to..." dropdown (list other columns)
3. Tasks are moved to selected column, then column is deleted
4. If column is empty: delete immediately with confirmation

### Global Kanban Page
- Uses default columns (projectId = null from `boardColumns` table)
- Filter by project still works — tasks show in whichever column their status matches
- No column management UI on global board (columns are project-scoped)

### Project Kanban Page
- Fetches that project's columns from `boardColumns` table
- Full column management UI available
- When creating a task inline in a column, `status` is set to that column's `key`

### TaskDetailModal Status Dropdown
- Status dropdown should load from the project's columns (not hardcoded)
- Pass columns as props to the modal, or fetch via API

---

## Server Component Changes

### `src/app/dashboard/kanban/page.tsx`
- Fetch global default columns from `boardColumns` (where `projectId IS NULL`)
- Order by `position`
- Group tasks using fetched columns instead of hardcoded array

### `src/app/dashboard/projects/[id]/page.tsx`
- Fetch project-specific columns from `boardColumns` (where `projectId = id`)
- Order by `position`
- Group tasks using fetched columns
- Pass columns as prop to `KanbanBoard`

### `src/app/dashboard/projects/[id]/KanbanBoard.tsx`
- Accept `columns: BoardColumn[]` prop instead of using hardcoded array
- Convert to `Column[]` with tasks grouped
- Pass columns to shared `TaskCard` and other components

### `src/app/dashboard/kanban/KanbanBoardClient.tsx`
- Accept `defaultColumns: BoardColumn[]` prop
- Use shared components from `src/components/kanban/`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/kanban-utils.ts` | Shared types, defaults, utilities |
| `src/components/kanban/BoardColumn.tsx` | Shared column component |
| `src/components/kanban/TaskCard.tsx` | Shared draggable task card |
| `src/components/kanban/ColumnHeader.tsx` | Column header with count + menu |
| `src/components/kanban/ColumnMenu.tsx` | Column action dropdown |
| `src/components/kanban/AddColumnForm.tsx` | Inline column creation form |
| `src/components/kanban/ColumnColorPicker.tsx` | Color picker for columns |
| `src/app/api/projects/[id]/columns/route.ts` | GET + POST columns |
| `src/app/api/projects/[id]/columns/[columnId]/route.ts` | PATCH + DELETE column |
| `src/app/api/projects/[id]/columns/reorder/route.ts` | PATCH reorder columns |
| `src/app/api/board-columns/defaults/route.ts` | GET global defaults |

## Files to Modify

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `boardColumns` table, change `tasks.status` to text, remove `taskStatusEnum` |
| `src/app/dashboard/kanban/page.tsx` | Fetch columns from DB, remove hardcoded array, use shared utils |
| `src/app/dashboard/kanban/KanbanBoardClient.tsx` | Accept columns prop, use shared components, remove duplicated code |
| `src/app/dashboard/projects/[id]/page.tsx` | Fetch columns from DB, remove hardcoded array, pass as prop |
| `src/app/dashboard/projects/[id]/KanbanBoard.tsx` | Accept columns prop, use shared components, remove duplicated code |
| `src/app/dashboard/projects/[id]/TaskDetailModal.tsx` | Status dropdown loads from project columns |
| `src/app/api/projects/route.ts` | POST: copy default columns to new project |
| `src/hooks/useTasks.ts` | No changes needed (status is already text) |

---

## Migration Strategy

1. Create `boardColumns` table
2. Seed global defaults (projectId = null)
3. Seed columns for each existing project (copy of defaults)
4. Change `tasks.status` from enum to text (PG: `ALTER COLUMN status TYPE text USING status::text`)
5. Drop `taskStatusEnum` type
6. Build API routes for columns CRUD
7. Extract shared kanban components
8. Update server components to fetch columns from DB
9. Update client components to use shared components + columns prop
10. Add column management UI
11. Update project creation to copy default columns
12. Run `bun run db:generate` + `bun run db:migrate`

---

## Activity Logging

Column mutations should log to `activity_logs`:
- `action: "created_board_column"`, `entityType: "board_column"`, `details: "Created column: {name} in project: {projectName}"`
- `action: "updated_board_column"`, `entityType: "board_column"`, `details: "Updated column: {name}"`
- `action: "deleted_board_column"`, `entityType: "board_column"`, `details: "Deleted column: {name}"`

---

## Real-time

Column changes should broadcast via Pusher on the existing `project-{id}` channel:
```ts
broadcastTaskEvent(projectId, {
  type: "column_updated" | "column_created" | "column_deleted",
  column: { ... },
});
```

Other clients subscribed to the same project receive the event and invalidate/refetch columns.

---

## Acceptance Criteria

- [ ] Columns are stored in the database, not hardcoded
- [ ] Each project has its own set of columns
- [ ] Global kanban uses default columns
- [ ] Superadmin/admin can create new columns per project
- [ ] Superadmin/admin can rename columns and change colors
- [ ] Superadmin/admin can delete columns (with task reassignment prompt)
- [ ] Columns can be reordered via drag-and-drop or manual ordering
- [ ] New projects automatically get the default column set
- [ ] Task status updates correctly when dragged between custom columns
- [ ] TaskDetailModal status dropdown shows project-specific columns
- [ ] Shared kanban components eliminate code duplication
- [ ] No hardcoded `statusColumns` array remains in any file
- [ ] Activity logging works for column CRUD
- [ ] Real-time updates work for column changes
- [ ] `bun run lint`, `bun run typecheck`, `bun run build` all pass

---

## Execution Order

1. DB schema changes + migration (add boardColumns, change tasks.status, remove enum)
2. Seed data (global defaults + per-project copies)
3. Board columns API routes (CRUD + reorder + defaults)
4. Shared kanban utilities (`kanban-utils.ts`)
5. Extract shared kanban components (TaskCard, BoardColumn, etc.)
6. Update global kanban page server component
7. Update global kanban client component
8. Update project kanban page server component
9. Update project kanban client component
10. Add column management UI (ColumnMenu, AddColumnForm, ColorPicker)
11. Update TaskDetailModal status dropdown
12. Update project creation to copy default columns
13. Activity logging for column mutations
14. Real-time broadcasting for column changes
15. Lint, typecheck, build
