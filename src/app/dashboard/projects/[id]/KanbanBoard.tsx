"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
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
import TaskAssigneePopover from "@/components/TaskAssigneePopover";
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
  projectName?: string | null;
  projectColor?: string | null;
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
  allProjects: Project[];
  currentUserId: string;
}

function TaskCard({
  task,
  users,
  onClick,
  isOverlay,
}: {
  task: Task;
  users: User[];
  onClick?: () => void;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isOverlay });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        "bg-surface-strong/50 border border-border-default rounded-xl p-3 cursor-pointer transition-all hover:border-brand-500/50 hover:bg-overlay-5",
        priorityColors[task.priority],
        isOverlay && "shadow-2xl ring-2 ring-brand-500/50 rotate-2 cursor-grabbing",
        isDragging && !isOverlay && "opacity-30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-text-primary truncate pr-2">{task.title}</h4>
        {!isOverlay && (
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 p-1 text-text-dim hover:text-text-muted opacity-0 group-hover:opacity-100"
            aria-label="Drag"
          >
            <GripVertical size={14} />
          </button>
        )}
      </div>

      {task.description && (
        <p className="mt-2 text-xs text-text-dim line-clamp-2">{task.description}</p>
      )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border", priorityBadges[task.priority])}>
              {task.priority}
            </span>
            {!isOverlay && (
              <TaskAssigneePopover
                taskId={task.id}
                currentAssigneeId={task.assigneeId}
                users={users}
                size="sm"
              />
            )}
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-1 text-[10px] text-text-dim">
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
  addForm,
}: {
  column: Column;
  users: User[];
  onTaskClick: (task: Task) => void;
  addForm?: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: column.key });

  return (
    <SortableContext
      items={column.tasks.map((t) => t.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className="flex flex-col h-full min-h-[500px]"
        data-column-key={column.key}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
            <h3 className="text-sm font-semibold text-text-primary capitalize">{column.label}</h3>
            <span className="text-xs text-text-dim bg-overlay-5 px-2 py-0.5 rounded-full">
              {column.tasks.length}
            </span>
          </div>
        </div>

        {addForm && <div className="mb-3">{addForm}</div>}

        <div
          className="flex-1 min-h-[400px] space-y-2 overflow-y-auto pr-1"
          role="list"
          aria-label={`${column.label} tasks`}
        >
          {column.tasks.length === 0 && (
            <div className="h-24 border-2 border-dashed border-border-subtle rounded-xl flex items-center justify-center">
              <span className="text-text-dim text-xs">Drop tasks here</span>
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

export default function KanbanBoard({
  projectId,
  initialColumns,
  users,
  allProjects,
  currentUserId,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [showNewTask, setShowNewTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Keyboard shortcuts listener — open add-task form on "todo" column
  useEffect(() => {
    function handleNewTask(event: Event) {
      const detail = (event as CustomEvent).detail as { status?: string } | undefined;
      setShowNewTask(detail?.status ?? "todo");
    }
    window.addEventListener("keyboard:new-task", handleNewTask);
    return () => window.removeEventListener("keyboard:new-task", handleNewTask);
  }, []);

  const [newTaskData, setNewTaskData] = useState<Record<string, { title: string; description: string; priority: string; assigneeId: string; dueDate: string; projectId: string }>>({});

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

  // Subscribe to real-time task updates for this project
  useRealtime(projectId);

  const columnsRef = useRef<Column[]>(columns);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const sourceColumnRef = useRef<string | null>(null);
  const snapshotRef = useRef<Column[] | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const currentColumns = columnsRef.current;
    const task = currentColumns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (!task) return;
    setActiveTask(task);
    const col = currentColumns.find((c) => c.tasks.some((t) => t.id === taskId));
    sourceColumnRef.current = col?.key ?? null;
    snapshotRef.current = JSON.parse(JSON.stringify(currentColumns));
    event.active.data.current = { task, sourceColumn: col?.key };
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    setColumns((prev) => {
      const activeColumn = prev.find((c) => c.tasks.some((t) => t.id === activeId));
      if (!activeColumn) return prev; // task already removed (shouldn't happen with DragOverlay)

      const overColumn = prev.find((c) => c.key === overId || c.tasks.some((t) => t.id === overId));
      if (!overColumn) return prev;

      if (activeColumn.key === overColumn.key) {
        const overTask = overColumn.tasks.find((t) => t.id === overId);
        if (!overTask) return prev; // dropped on empty column in same column
        const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
        const overIndex = overColumn.tasks.findIndex((t) => t.id === overId);
        if (activeIndex === overIndex) return prev;
        return prev.map((col) => {
          if (col.key === activeColumn.key) {
            return { ...col, tasks: arrayMove(col.tasks, activeIndex, overIndex) };
          }
          return col;
        });
      }

      // Cross-column
      const activeTaskItem = activeColumn.tasks.find((t) => t.id === activeId);
      if (!activeTaskItem) return prev;

      const overTask = overColumn.tasks.find((t) => t.id === overId);
      const overIndex = overTask ? overColumn.tasks.findIndex((t) => t.id === overId) : overColumn.tasks.length;

      return prev.map((col) => {
        if (col.key === activeColumn.key) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== activeId) };
        }
        if (col.key === overColumn.key) {
          const newTasks = [...col.tasks];
          newTasks.splice(overIndex, 0, { ...activeTaskItem, status: overColumn.key });
          return { ...col, tasks: newTasks };
        }
        return col;
      });
    });
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) {
      // Drop outside any droppable — revert to snapshot
      if (snapshotRef.current) setColumns(snapshotRef.current);
      snapshotRef.current = null;
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const currentColumns = columnsRef.current;
    const sourceKey = sourceColumnRef.current;
    if (!sourceKey) {
      snapshotRef.current = null;
      return;
    }

    let targetKey: string;
    let targetIndex: number;

    const overColumn = currentColumns.find((c) => c.key === overId);
    if (overColumn) {
      targetKey = overColumn.key;
      targetIndex = 0;
    } else {
      const overTask = currentColumns.flatMap((c) => c.tasks).find((t) => t.id === overId);
      if (!overTask) {
        if (snapshotRef.current) setColumns(snapshotRef.current);
        snapshotRef.current = null;
        return;
      }
      targetKey = currentColumns.find((c) => c.tasks.some((t) => t.id === overId))?.key ?? overTask.status;
      targetIndex = currentColumns.find((c) => c.key === targetKey)?.tasks.findIndex((t) => t.id === overId) ?? 0;
    }

    try {
      if (sourceKey !== targetKey) {
        await updateTask.mutateAsync({ id: activeId, status: targetKey, position: String(targetIndex) });
      } else {
        const col = currentColumns.find((c) => c.key === sourceKey);
        if (!col) return;
        const activeIndex = col.tasks.findIndex((t) => t.id === activeId);
        const overIndex = col.tasks.findIndex((t) => t.id === overId);
        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
          const newTasks = arrayMove(col.tasks, activeIndex, overIndex);
          const updates = newTasks.map((t, i) => ({ id: t.id, position: String(i) }));
          await reorderTasks.mutateAsync(updates);
        }
      }
    } catch {
      // On error, revert columns to snapshot
      if (snapshotRef.current) setColumns(snapshotRef.current);
    } finally {
      snapshotRef.current = null;
    }
  }, [updateTask, reorderTasks]);

  async function handleCreateTask(status: string) {
    const data = newTaskData[status];
    if (!data?.title.trim()) return;

    try {
      const task = await createTask.mutateAsync({
        title: data.title.trim(),
        description: data.description?.trim() || null,
        priority: data.priority || "medium",
        status,
        projectId,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate || null,
      });
      setShowNewTask(null);
      setNewTaskData((prev) => ({ ...prev, [status]: { title: "", description: "", priority: "medium", assigneeId: "", dueDate: "", projectId: "" } }));

      setColumns((prev) =>
        prev.map((col) =>
          col.key === status
            ? { ...col, tasks: [task, ...col.tasks] }
            : col
        )
      );
    } catch (err) {
      console.error("Failed to create task:", err);
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
          const isAdding = showNewTask === colConfig.key;
          const taskForm = (
            <>
              <button
                onClick={() => setShowNewTask(isAdding ? null : colConfig.key)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-text-dim hover:text-text-primary hover:bg-overlay-5 rounded-lg transition"
              >
                <Plus size={16} />
                {isAdding ? "Cancel" : "Add task"}
              </button>

              {isAdding && (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleCreateTask(colConfig.key); }}
                  className="mt-2 bg-surface-strong/50 border border-border-default rounded-xl p-3 space-y-3 animate-slide-down"
                >
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTaskData[colConfig.key]?.title || ""}
                    onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], title: e.target.value } }))}
                    className="w-full rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                    required
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newTaskData[colConfig.key]?.description || ""}
                    onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], description: e.target.value } }))}
                    className="w-full rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[60px] resize-none"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newTaskData[colConfig.key]?.priority || "medium"}
                      onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], priority: e.target.value } }))}
                      className="rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <select
                      value={newTaskData[colConfig.key]?.assigneeId || ""}
                      onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], assigneeId: e.target.value } }))}
                      className="rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={newTaskData[colConfig.key]?.projectId || projectId}
                    onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], projectId: e.target.value } }))}
                    className="w-full rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {allProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={newTaskData[colConfig.key]?.dueDate || ""}
                    onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], dueDate: e.target.value } }))}
                    className="w-full rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewTask(null)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-overlay-5 text-text-dim hover:text-text-primary hover:bg-overlay-10 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createTask.isPending}
                      className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-brand-500 text-text-primary hover:bg-brand-600 disabled:opacity-50 transition"
                    >
                      {createTask.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Create task"}
                    </button>
                  </div>
                </form>
              )}
            </>
          );
          return (
            <div key={colConfig.key} className="w-72 flex-shrink-0">
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

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onChange={() => {}}
          onDelete={(taskId) => {
            setColumns((prev) =>
              prev.map((col) => ({
                ...col,
                tasks: col.tasks.filter((t) => t.id !== taskId),
              }))
            );
            setSelectedTask(null);
          }}
        />
      )}

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCard task={activeTask} users={users} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}