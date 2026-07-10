"use client";

import {
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Loader2, X, GripVertical, Calendar, MessageSquare } from "lucide-react";
import { clsx } from "clsx";
import TaskDetailModal from "./TaskDetailModal";
import RichTextEditor from "@/components/RichTextEditor";
import { api } from "@/lib/api";

type User = { id: string; name: string; avatarUrl: string | null };
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

interface KanbanBoardProps {
  projectId: string;
  initialColumns: Column[];
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

export default function KanbanBoard({
  projectId,
  initialColumns,
  users,
  currentUserId,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [showNewTask, setShowNewTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const router = useRouter();

  const [newTaskData, setNewTaskData] = useState<Record<string, { title: string; description: string; priority: string; assigneeId: string; dueDate: string }>>({});
  const [creating, setCreating] = useState<string | null>(null);

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

  const updateTask = useCallback(async (taskId: string, data: Partial<Task>) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error("Failed to update task:", err);
      router.refresh();
    }
  }, [router]);

  const updateTasksPositions = useCallback(async (updates: { id: string; position: string }[]) => {
    try {
      await Promise.all(
        updates.map((u) =>
          fetch(`/api/tasks/${u.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: u.position }),
          })
        )
      );
    } catch (err) {
      console.error("Failed to update positions:", err);
      router.refresh();
    }
  }, [router]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = columns.flatMap((c) => c.tasks).find((t) => t.id === activeId);
    const overTask = columns.flatMap((c) => c.tasks).find((t) => t.id === overId);

    if (!activeTask) return;

    const activeColumn = columns.find((c) => c.tasks.some((t) => t.id === activeId));
    const overColumn = columns.find((c) => c.tasks.some((t) => t.id === overId));

    if (activeColumn && overColumn) {
      if (activeColumn.key !== overColumn.key) {
        const overIndex = overColumn.tasks.findIndex((t) => t.id === overId);
        await updateTask(activeId, { status: overColumn.key, position: String(overIndex) });
      } else {
        const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
        const overIndex = overColumn.tasks.findIndex((t) => t.id === overId);
        const newTasks = arrayMove(activeColumn.tasks, activeIndex, overIndex);
        const updates = newTasks.map((t, i) => ({ id: t.id, position: String(i) }));
        await updateTasksPositions(updates);
      }
    }
    router.refresh();
  }, [columns, router, updateTask, updateTasksPositions]);

  async function handleCreateTask(status: string) {
    const data = newTaskData[status];
    if (!data?.title.trim()) return;
    setCreating(status);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title.trim(),
          description: data.description.trim() || null,
          priority: data.priority,
          status,
          projectId,
          assigneeId: data.assigneeId || null,
          dueDate: data.dueDate || null,
        }),
      });

      if (res.ok) {
        setShowNewTask(null);
        setNewTaskData((prev) => ({ ...prev, [status]: { title: "", description: "", priority: "medium", assigneeId: "", dueDate: "" } }));
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreating(null);
    }
  }

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map((colConfig) => {
          const column = columns.find((c) => c.key === colConfig.key) || { ...colConfig, tasks: [] };
          return (
            <div key={colConfig.key} className="w-72 flex-shrink-0">
              <Column
                column={column}
                onTaskClick={setSelectedTask}
                onDragStart={(task) => {}}
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
                  <input
                    type="date"
                    value={newTaskData[colConfig.key]?.dueDate || ""}
                    onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], dueDate: e.target.value } }))}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
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
                      disabled={creating === colConfig.key}
                      className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition"
                    >
                      {creating === colConfig.key ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Create task"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onChange={() => router.refresh()}
        />
      )}
    </DndContext>
  );
}