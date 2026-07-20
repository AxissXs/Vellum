"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useSyncExternalStore,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  rectIntersection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Loader2,
  X,
  GripVertical,
  Calendar,
  ChevronDown,
  Search,
  Kanban,
} from "lucide-react";
import { clsx } from "clsx";
import TaskDetailModal from "@/app/dashboard/projects/[id]/TaskDetailModal";
import { useCreateTask, useReorderTasks } from "@/hooks/useTasks";
import { useRealtime, type TaskUpdatePayload } from "@/hooks/useRealtime";
import { applyTaskEventToColumns } from "@/lib/kanban-realtime";

type User = { id: string; name: string; avatarUrl: string | null };
type Project = { id: string; name: string; color: string | null };
type Task = {
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
  projectName: string | null;
  projectColor: string | null;
};
type Column = { key: string; label: string; color: string; tasks: Task[] };

const statusColumns = [
  { key: "backlog", label: "Backlog", color: "bg-slate-500" },
  { key: "todo", label: "To Do", color: "bg-blue-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { key: "review", label: "Review", color: "bg-purple-500" },
  { key: "done", label: "Done", color: "bg-emerald-500" },
];

const priorityColors: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-500",
  low: "border-l-emerald-500",
};

const priorityBadges: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-600",
  high: "bg-orange-500/10 text-orange-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-emerald-500/10 text-emerald-600",
};

function columnDroppableId(columnKey: string) {
  return `column-${columnKey}`;
}

function isColumnDroppableId(id: string) {
  return id.startsWith("column-");
}

function findColumnForTask(columns: Column[], taskId: string) {
  return columns.find((column) => column.tasks.some((task) => task.id === taskId));
}

function resolveOverColumn(columns: Column[], overId: string) {
  if (isColumnDroppableId(overId)) {
    const columnKey = overId.slice("column-".length);
    return columns.find((column) => column.key === columnKey);
  }
  return findColumnForTask(columns, overId);
}

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    const taskCollision = pointerCollisions.find(
      (collision) => !isColumnDroppableId(String(collision.id))
    );
    if (taskCollision) return [taskCollision];
    return pointerCollisions;
  }
  return rectIntersection(args);
};

interface KanbanBoardClientProps {
  initialColumns: Column[];
  projects: Project[];
  users: User[];
  currentUserId: string;
  userRole?: string;
}

function TaskCardBody({ task }: { task: Task }) {
  return (
    <>
      {task.description && (
        <p className="mt-2 text-xs text-slate-500 line-clamp-2">{task.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border", priorityBadges[task.priority])}>
            {task.priority}
          </span>
          {task.assigneeName && (
            <div className="flex -space-x-1.5">
              <div className="h-5 w-5 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-[10px] font-bold text-brand-600">
                {task.assigneeName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
            </div>
          )}
        </div>

        {task.dueDate && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Calendar size={10} />
            <span>{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        )}

        {task.projectName && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: task.projectColor || "#6366f1" }} />
            <span className="truncate max-w-[100px]">{task.projectName}</span>
          </div>
        )}
      </div>
    </>
  );
}

function StaticTaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer transition-all hover:border-brand-500/50 hover:bg-slate-100",
        priorityColors[task.priority]
      )}
    >
      <h4 className="text-sm font-medium text-slate-900 truncate pr-2">{task.title}</h4>
      <TaskCardBody task={task} />
    </div>
  );
}

function StaticKanbanBoard({
  columns,
  onTaskClick,
}: {
  columns: Column[];
  onTaskClick: (task: Task) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto overscroll-x-contain pb-4 flex-1 min-h-0">
      {statusColumns.map((colConfig) => {
        const column = columns.find((c) => c.key === colConfig.key) || { ...colConfig, tasks: [] };
        return (
          <div key={colConfig.key} className="w-72 shrink-0">
            <div className="flex flex-col h-full min-h-[500px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                  <h3 className="text-sm font-semibold text-slate-900 capitalize">{column.label}</h3>
                  <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                    {column.tasks.length}
                  </span>
                </div>
              </div>
              <div
                className="flex-1 min-h-[400px] space-y-2 overflow-y-auto pr-1 rounded-xl"
                role="list"
                aria-label={`${column.label} tasks`}
              >
                {column.tasks.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                    <span className="text-slate-600 text-xs">Drop tasks here</span>
                  </div>
                )}
                {column.tasks.map((task) => (
                  <StaticTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  users,
  onClick,
}: {
  task: Task;
  users: User[];
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={clsx(
        "group bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer transition-all hover:border-brand-500/50 hover:bg-slate-100",
        priorityColors[task.priority],
        isDragging && "shadow-lg ring-2 ring-brand-500/50 z-10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-slate-900 truncate pr-2">{task.title}</h4>
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 min-h-[44px] min-w-[44px] -m-2 flex items-center justify-center text-slate-500 hover:text-slate-600 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 touch-none cursor-grab active:cursor-grabbing"
          aria-label="Drag"
        >
          <GripVertical size={16} />
        </button>
      </div>

      <TaskCardBody task={task} />
    </div>
  );
}

function Column({
  column,
  users,
  onTaskClick,
  addForm,
}: {
  column: Column;
  users: User[];
  onTaskClick: (task: Task) => void;
  addForm?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnDroppableId(column.key),
    data: { type: "column", columnKey: column.key },
  });

  return (
    <SortableContext
      items={column.tasks.map((t) => t.id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="flex flex-col h-full min-h-[500px]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
            <h3 className="text-sm font-semibold text-slate-900 capitalize">{column.label}</h3>
            <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
              {column.tasks.length}
            </span>
          </div>
        </div>

        {addForm && <div className="mb-3">{addForm}</div>}

        <div
          ref={setNodeRef}
          className={clsx(
            "flex-1 min-h-[400px] space-y-2 overflow-y-auto pr-1 rounded-xl transition-colors",
            isOver && "bg-brand-500/5 ring-2 ring-brand-500/20"
          )}
          role="list"
          aria-label={`${column.label} tasks`}
        >
          {column.tasks.length === 0 && (
            <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
              <span className="text-slate-600 text-xs">Drop tasks here</span>
            </div>
          )}
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              users={users}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </div>
      </div>
    </SortableContext>
  );
}

export default function KanbanBoardClient({
  initialColumns,
  projects,
  users,
  currentUserId,
  userRole = "member",
}: KanbanBoardClientProps) {
  // Temporarily disabled on kanban — create via backlog / other surfaces.
  const canCreateTasks = false;
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [showNewTask, setShowNewTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  /** Status before drag — dragOver moves card locally before dragEnd runs. */
  const dragOriginStatusRef = useRef<string | null>(null);
  const columnsBeforeDragRef = useRef<Column[] | null>(null);
  const columnsRef = useRef(columns);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Mounted flag: render the static board on the server/first paint, then
  // mount DndContext on the client to avoid hydration mismatch.
  const dndReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [newTaskData, setNewTaskData] = useState<Record<string, { title: string; description: string; priority: string; assigneeId: string; dueDate: string; projectId: string }>>({});

  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createTask = useCreateTask();
  const reorderTasks = useReorderTasks();

  const handleRemoteTaskEvent = useCallback((payload: TaskUpdatePayload) => {
    setColumns((prev) => {
      const next = applyTaskEventToColumns(prev, payload) as Column[];
      if (next !== prev) columnsRef.current = next;
      return next;
    });

    if (payload.type === "deleted" && payload.taskId) {
      setSelectedTask((t) => (t?.id === payload.taskId ? null : t));
    } else if (
      (payload.type === "created" || payload.type === "updated") &&
      payload.task
    ) {
      setSelectedTask((t) =>
        t?.id === payload.task!.id ? ({ ...t, ...payload.task } as Task) : t
      );
    }
  }, []);

  // Subscribe to global real-time task updates (cross-project board view)
  useRealtime(undefined, undefined, handleRemoteTaskEvent);

  const filteredColumns = useMemo(() => {
    if (selectedProjectId === "all" && !searchQuery) {
      return columns;
    }
    return columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((task) => {
        const projectMatch = selectedProjectId === "all" || task.projectId === selectedProjectId;
        const searchMatch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return projectMatch && searchMatch;
      }),
    }));
  }, [columns, selectedProjectId, searchQuery]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const currentColumns = columnsRef.current;
    const task = currentColumns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (task) {
      dragOriginStatusRef.current = task.status;
      columnsBeforeDragRef.current = currentColumns.map((c) => ({
        ...c,
        tasks: [...c.tasks],
      }));
      setActiveDragTask(task);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    setColumns((prev) => {
      const activeTask = prev.flatMap((c) => c.tasks).find((t) => t.id === activeId);
      if (!activeTask) return prev;

      const activeColumn = findColumnForTask(prev, activeId);
      const overColumn = resolveOverColumn(prev, overId);
      if (!activeColumn || !overColumn) return prev;

      if (activeColumn.key !== overColumn.key) {
        if (!activeColumn.tasks.some((t) => t.id === activeId)) return prev;
        return prev.map((col) => {
          if (col.key === activeColumn.key) {
            return { ...col, tasks: col.tasks.filter((t) => t.id !== activeId) };
          }
          if (col.key === overColumn.key) {
            const overIndex = isColumnDroppableId(overId)
              ? col.tasks.length
              : col.tasks.findIndex((t) => t.id === overId);
            const insertIndex = overIndex >= 0 ? overIndex : col.tasks.length;
            const newTasks = [...col.tasks];
            newTasks.splice(insertIndex, 0, {
              ...activeTask,
              status: overColumn.key,
              position: String(insertIndex),
            });
            return { ...col, tasks: newTasks };
          }
          return col;
        });
      }

      if (!isColumnDroppableId(overId)) {
        const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
        const overIndex = overColumn.tasks.findIndex((t) => t.id === overId);
        if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return prev;

        return prev.map((col) => {
          if (col.key === activeColumn.key) {
            const newTasks = arrayMove(col.tasks, activeIndex, overIndex).map((t, i) =>
              t.id === activeId ? { ...t, position: String(i) } : t
            );
            return { ...col, tasks: newTasks };
          }
          return col;
        });
      }

      return prev;
    });
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTask(null);
    const originStatus = dragOriginStatusRef.current;
    const before = columnsBeforeDragRef.current;
    dragOriginStatusRef.current = null;

    if (!over) {
      if (before) setColumns(before);
      columnsBeforeDragRef.current = null;
      return;
    }

    const cols = columnsRef.current;
    const activeId = active.id as string;
    const finalColumn = findColumnForTask(cols, activeId);
    if (!finalColumn || !originStatus) {
      columnsBeforeDragRef.current = null;
      return;
    }

    // dragOver already applied UI move — always persist final column order(s)
    const keys =
      originStatus === finalColumn.key
        ? [finalColumn.key]
        : [originStatus, finalColumn.key];
    const updates: { id: string; position: string; status: string }[] = [];
    for (const key of keys) {
      const col = cols.find((c) => c.key === key);
      if (!col) continue;
      col.tasks.forEach((t, i) => {
        updates.push({ id: t.id, position: String(i), status: col.key });
      });
    }

    if (updates.length === 0) {
      columnsBeforeDragRef.current = null;
      return;
    }

    try {
      await reorderTasks.mutateAsync(updates);
      columnsBeforeDragRef.current = null;
    } catch {
      if (before) setColumns(before);
      columnsBeforeDragRef.current = null;
    }
  }, [reorderTasks]);

  const handleDragCancel = useCallback(() => {
    setActiveDragTask(null);
    if (columnsBeforeDragRef.current) {
      setColumns(columnsBeforeDragRef.current);
    }
    dragOriginStatusRef.current = null;
    columnsBeforeDragRef.current = null;
  }, []);

  async function handleCreateTask(status: string) {
    const data = newTaskData[status];
    if (!data?.title.trim()) return;

    try {
      const created = await createTask.mutateAsync({
        title: data.title.trim(),
        description: data.description.trim() || null,
        priority: data.priority,
        status,
        projectId: data.projectId,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate || null,
      });
      const assignee = users.find((u) => u.id === created.assigneeId) ?? null;
      const project = projects.find((p) => p.id === created.projectId) ?? null;
      setColumns((prev) =>
        prev.map((col) =>
          col.key === status
            ? {
                ...col,
                tasks: [
                  ...col.tasks,
                  {
                    ...created,
                    dueDate: created.dueDate ?? null,
                    position: created.position ?? String(col.tasks.length),
                    assigneeName: assignee?.name ?? null,
                    assigneeAvatar: assignee?.avatarUrl ?? null,
                    projectName: project?.name ?? null,
                    projectColor: project?.color ?? null,
                  },
                ],
              }
            : col
        )
      );
      setShowNewTask(null);
      setNewTaskData((prev) => ({
        ...prev,
        [status]: {
          title: "",
          description: "",
          priority: "medium",
          assigneeId: "",
          dueDate: "",
          projectId: "",
        },
      }));
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }

  function handleTaskDetailChange(
    updated: {
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
    } | null
  ) {
    if (!updated) {
      const id = selectedTask?.id;
      if (!id) return;
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== id),
        }))
      );
      setSelectedTask(null);
      return;
    }

    const enriched: Task = {
      ...updated,
      projectName:
        projects.find((p) => p.id === updated.projectId)?.name ?? null,
      projectColor:
        projects.find((p) => p.id === updated.projectId)?.color ?? null,
    };

    setColumns((prev) => {
      const without = prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== enriched.id),
      }));
      return without.map((col) =>
        col.key === enriched.status
          ? { ...col, tasks: [...col.tasks, enriched] }
          : col
      );
    });
    setSelectedTask(enriched);
  }

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  const projectsWithAll = useMemo(() => [
    { id: "all", name: "All Projects", color: null },
    ...projects,
  ], [projects]);

  const taskDetailModal = selectedTask ? (
    <TaskDetailModal
      key={selectedTask.id}
      task={selectedTask}
      users={users}
      currentUserId={currentUserId}
      userRole={userRole}
      onClose={() => setSelectedTask(null)}
      onChange={handleTaskDetailChange}
    />
  ) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Kanban size={24} className="text-brand-600" />
          <h1 className="text-2xl font-bold text-slate-900">Kanban Board</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Project Filter */}
          <div className="relative">
            <label htmlFor="project-filter" className="sr-only">Filter by project</label>
            <select
              id="project-filter"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
            >
              {projectsWithAll.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none size-4" />
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor="kanban-search" className="sr-only">Search tasks</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 size-4" />
            <input
              id="kanban-search"
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {!dndReady ? (
        <StaticKanbanBoard columns={filteredColumns} onTaskClick={setSelectedTask} />
      ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        autoScroll={{
          threshold: { x: 0.12, y: 0.2 },
          acceleration: 12,
          layoutShiftCompensation: { x: true, y: true },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={boardScrollRef}
          className="flex gap-4 overflow-x-auto overscroll-x-contain pb-4 flex-1 min-h-0"
        >
          {statusColumns.map((colConfig) => {
            const column = filteredColumns.find((c) => c.key === colConfig.key) || { ...colConfig, tasks: [] };
            const isAdding = showNewTask === colConfig.key;
            const taskForm = canCreateTasks ? (
              <>
                <button
                  onClick={() => setShowNewTask(isAdding ? null : colConfig.key)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  <Plus size={16} />
                  {isAdding ? "Cancel" : "Add task"}
                </button>

                {isAdding && (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleCreateTask(colConfig.key); }}
                    className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 animate-slide-down"
                  >
                    <input
                      type="text"
                      placeholder="Task title"
                      value={newTaskData[colConfig.key]?.title || ""}
                      onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], title: e.target.value } }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                      required
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={newTaskData[colConfig.key]?.description || ""}
                      onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], description: e.target.value } }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[60px] resize-none"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newTaskData[colConfig.key]?.priority || "medium"}
                        onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], priority: e.target.value } }))}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <select
                        value={newTaskData[colConfig.key]?.assigneeId || ""}
                        onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], assigneeId: e.target.value } }))}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newTaskData[colConfig.key]?.projectId || (selectedProjectId !== "all" ? selectedProjectId : projects[0]?.id || "")}
                        onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], projectId: e.target.value } }))}
                        className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={newTaskData[colConfig.key]?.dueDate || ""}
                        onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], dueDate: e.target.value } }))}
                        className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewTask(null)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createTask.isPending && showNewTask === colConfig.key}
                        className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition"
                      >
                        {createTask.isPending && showNewTask === colConfig.key ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Create task"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : null;
            return (
              <div key={colConfig.key} className="w-72 shrink-0">
                <Column
                  column={column}
                  onTaskClick={setSelectedTask}
                  users={users}
                  addForm={taskForm}
                />
              </div>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragTask ? (
            <div
              className={clsx(
                "bg-slate-100 border border-brand-500/40 rounded-xl p-3 shadow-lg cursor-grabbing w-72",
                priorityColors[activeDragTask.priority]
              )}
            >
              <h4 className="text-sm font-medium text-slate-900 truncate">{activeDragTask.title}</h4>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}

      {taskDetailModal}
    </div>
  );
}