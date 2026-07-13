"use client";

import {
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
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
import { useCreateTask, useUpdateTask, useReorderTasks } from "@/hooks/useTasks";
import { useRealtime } from "@/hooks/useRealtime";

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
  urgent: "bg-red-500/10 text-red-400",
  high: "bg-orange-500/10 text-orange-400",
  medium: "bg-amber-500/10 text-amber-400",
  low: "bg-emerald-500/10 text-emerald-400",
};

interface KanbanBoardClientProps {
  initialColumns: Column[];
  projects: Project[];
  users: User[];
  currentUserId: string;
}

function TaskCard({
  task,
  users,
  onClick,
  onDragStart,
}: {
  task: Task;
  users: User[];
  onClick: () => void;
  onDragStart: () => void;
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
      {...attributes}
      {...listeners}
      onClick={onClick}
      onDragStart={onDragStart}
      className={clsx(
        "bg-slate-800/50 border border-white/10 rounded-xl p-3 cursor-pointer transition-all hover:border-brand-500/50 hover:bg-white/5",
        priorityColors[task.priority],
        isDragging && "shadow-2xl ring-2 ring-brand-500/50 z-10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-white truncate pr-2">{task.title}</h4>
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100"
          aria-label="Drag"
        >
          <GripVertical size={14} />
        </button>
      </div>

      {task.description && (
        <p className="mt-2 text-xs text-slate-400 line-clamp-2">{task.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border", priorityBadges[task.priority])}>
            {task.priority}
          </span>
          {task.assigneeName && (
            <div className="flex -space-x-1.5">
              <div className="h-5 w-5 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-[10px] font-bold text-brand-400">
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
    </div>
  );
}

function Column({
  column,
  users,
  onTaskClick,
  onDragStart,
}: {
  column: Column;
  users: User[];
  onTaskClick: (task: Task) => void;
  onDragStart: (task: Task) => void;
}) {
  return (
    <SortableContext
      items={column.tasks.map((t) => t.id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="flex flex-col h-full min-h-[500px]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
            <h3 className="text-sm font-semibold text-white capitalize">{column.label}</h3>
            <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
              {column.tasks.length}
            </span>
          </div>
        </div>

        <div
          className="flex-1 min-h-[400px] space-y-2 overflow-y-auto pr-1"
          role="list"
          aria-label={`${column.label} tasks`}
        >
          {column.tasks.length === 0 && (
            <div className="h-24 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center">
              <span className="text-slate-600 text-xs">Drop tasks here</span>
            </div>
          )}
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              users={users}
              onClick={() => onTaskClick(task)}
              onDragStart={() => onDragStart(task)}
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
}: KanbanBoardClientProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [showNewTask, setShowNewTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [newTaskData, setNewTaskData] = useState<Record<string, { title: string; description: string; priority: string; assigneeId: string; dueDate: string; projectId: string }>>({});

  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();

  // Subscribe to global real-time task updates (cross-project board view)
  useRealtime();

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
    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (task) {
      event.active.data.current = { task };
    }
  }, [columns]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = columns.flatMap((c) => c.tasks).find((t) => t.id === activeId);
    const overTask = columns.flatMap((c) => c.tasks).find((t) => t.id === overId);

    if (activeTask && overTask) {
      const activeColumn = columns.find((c) => c.tasks.some((t) => t.id === activeId));
      const overColumn = columns.find((c) => c.tasks.some((t) => t.id === overId));

      if (activeColumn && overColumn && activeColumn.key !== overColumn.key) {
        setColumns((prev) =>
          prev.map((col) => {
            if (col.key === activeColumn.key) {
              return { ...col, tasks: col.tasks.filter((t) => t.id !== activeId) };
            }
            if (col.key === overColumn.key) {
              const overIndex = col.tasks.findIndex((t) => t.id === overId);
              const newTasks = [...col.tasks];
              newTasks.splice(overIndex, 0, { ...activeTask, status: overColumn.key, position: String(overIndex) });
              return { ...col, tasks: newTasks };
            }
            return col;
          })
        );
      } else if (activeColumn && overColumn && activeColumn.key === overColumn.key) {
        const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
        const overIndex = overColumn.tasks.findIndex((t) => t.id === overId);
        setColumns((prev) =>
          prev.map((col) => {
            if (col.key === activeColumn.key) {
              const newTasks = arrayMove(col.tasks, activeIndex, overIndex).map((t, i) =>
                t.id === activeId || t.id === overId ? { ...t, position: String(i) } : t
              );
              return { ...col, tasks: newTasks };
            }
            return col;
          })
        );
      }
    }
  }, [columns]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = columns.flatMap((c) => c.tasks).find((t) => t.id === activeId);
    if (!activeTask) return;

    const activeColumn = columns.find((c) => c.tasks.some((t) => t.id === activeId));
    const overColumn = columns.find((c) => c.tasks.some((t) => t.id === overId));

    if (activeColumn && overColumn) {
      if (activeColumn.key !== overColumn.key) {
        const overIndex = overColumn.tasks.findIndex((t) => t.id === overId);
        await updateTask.mutateAsync({ id: activeId, status: overColumn.key, position: String(overIndex) });
      } else {
        const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
        const overIndex = overColumn.tasks.findIndex((t) => t.id === overId);
        const newTasks = arrayMove(activeColumn.tasks, activeIndex, overIndex);
        const updates = newTasks.map((t, i) => ({ id: t.id, position: String(i) }));
        await reorderTasks.mutateAsync(updates);
      }
    }
  }, [columns, updateTask, reorderTasks]);

  async function handleCreateTask(status: string) {
    const data = newTaskData[status];
    if (!data?.title.trim()) return;

    try {
      await createTask.mutateAsync({
        title: data.title.trim(),
        description: data.description.trim() || null,
        priority: data.priority,
        status,
        projectId: data.projectId,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate || null,
      });
      setShowNewTask(null);
      setNewTaskData((prev) => ({
        ...prev,
        [status]: { title: "", description: "", priority: "medium", assigneeId: "", dueDate: "", projectId: "" },
      }));
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  const projectsWithAll = useMemo(() => [
    { id: "all", name: "All Projects", color: null },
    ...projects,
  ], [projects]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Kanban size={24} className="text-brand-400" />
          <h1 className="text-2xl font-bold text-white">Kanban Board</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Project Filter */}
          <div className="relative">
            <label htmlFor="project-filter" className="sr-only">Filter by project</label>
            <select
              id="project-filter"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="appearance-none bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
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
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-10 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {statusColumns.map((colConfig) => {
            const column = filteredColumns.find((c) => c.key === colConfig.key) || { ...colConfig, tasks: [] };
            return (
              <div key={colConfig.key} className="w-72 flex-shrink-0">
                <Column
                  column={column}
                  onTaskClick={setSelectedTask}
                  onDragStart={() => {}}
                  users={users}
                />
                <button
                  onClick={() => setShowNewTask(colConfig.key)}
                  disabled={showNewTask === colConfig.key}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add task
                </button>

                {showNewTask === colConfig.key && (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleCreateTask(colConfig.key); }}
                    className="mt-3 bg-slate-800/50 border border-white/10 rounded-xl p-3 space-y-3 animate-slide-down"
                  >
                    <input
                      type="text"
                      placeholder="Task title"
                      value={newTaskData[colConfig.key]?.title || ""}
                      onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], title: e.target.value } }))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                      required
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={newTaskData[colConfig.key]?.description || ""}
                      onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], description: e.target.value } }))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[60px] resize-none"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newTaskData[colConfig.key]?.priority || "medium"}
                        onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], priority: e.target.value } }))}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <select
                        value={newTaskData[colConfig.key]?.assigneeId || ""}
                        onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], assigneeId: e.target.value } }))}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                        className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={newTaskData[colConfig.key]?.dueDate || ""}
                        onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], dueDate: e.target.value } }))}
                        className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewTask(null)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
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
              </div>
            );
          })}
        </div>
      </DndContext>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onChange={() => {}}
        />
      )}
    </div>
  );
}