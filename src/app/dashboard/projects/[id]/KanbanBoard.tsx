"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
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
import { Plus, Loader2, X, GripVertical, Calendar, MessageSquare } from "lucide-react";
import { clsx } from "clsx";
import TaskDetailModal from "./TaskDetailModal";
import RichTextEditor from "@/components/RichTextEditor";
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

interface KanbanBoardProps {
  projectId: string;
  initialColumns: Column[];
  users: User[];
  allProjects: Project[];
  currentUserId: string;
  sprintId?: string;
}

function TaskCardBody({ task }: { task: Task }) {
  return (
    <>
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
        "bg-slate-800/50 border border-white/10 rounded-xl p-3 cursor-pointer transition-all hover:border-brand-500/50 hover:bg-white/5",
        priorityColors[task.priority]
      )}
    >
      <h4 className="text-sm font-medium text-white truncate pr-2">{task.title}</h4>
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
    <div className="flex gap-4 overflow-x-auto overscroll-x-contain pb-4">
      {statusColumns.map((colConfig) => {
        const column = columns.find((c) => c.key === colConfig.key) || { ...colConfig, tasks: [] };
        return (
          <div key={colConfig.key} className="w-72 flex-shrink-0">
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
                className="flex-1 min-h-[400px] space-y-2 overflow-y-auto pr-1 rounded-xl"
                role="list"
                aria-label={`${column.label} tasks`}
              >
                {column.tasks.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center">
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
          className="flex-shrink-0 p-1 text-slate-500 hover:text-slate-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 touch-none"
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
  onDragStart,
  addForm,
}: {
  column: Column;
  users: User[];
  onTaskClick: (task: Task) => void;
  onDragStart: (task: Task) => void;
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
            <h3 className="text-sm font-semibold text-white capitalize">{column.label}</h3>
            <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
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
  allProjects,
  currentUserId,
  sprintId,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [showNewTask, setShowNewTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const [dndReady, setDndReady] = useState(false);
  const boardScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDndReady(true);
  }, []);

  const [newTaskData, setNewTaskData] = useState<Record<string, { title: string; description: string; priority: string; assigneeId: string; dueDate: string; projectId: string }>>({});

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
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();

  // Subscribe to real-time task updates for this project
  useRealtime(projectId);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (task) {
      event.active.data.current = { task };
      setActiveDragTask(task);
    }
  }, [columns]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = columns.flatMap((c) => c.tasks).find((t) => t.id === activeId);
    if (!activeTask) return;

    const activeColumn = findColumnForTask(columns, activeId);
    const overColumn = resolveOverColumn(columns, overId);
    if (!activeColumn || !overColumn) return;

    if (activeColumn.key !== overColumn.key) {
      setColumns((prev) =>
        prev.map((col) => {
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
        })
      );
      return;
    }

    if (!isColumnDroppableId(overId)) {
      const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
      const overIndex = overColumn.tasks.findIndex((t) => t.id === overId);
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;

      setColumns((prev) =>
        prev.map((col) => {
          if (col.key === activeColumn.key) {
            const newTasks = arrayMove(col.tasks, activeIndex, overIndex).map((t, i) =>
              t.id === activeId ? { ...t, position: String(i) } : t
            );
            return { ...col, tasks: newTasks };
          }
          return col;
        })
      );
    }
  }, [columns]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnForTask(columns, activeId);
    const overColumn = resolveOverColumn(columns, overId);
    if (!activeColumn || !overColumn) return;

    if (activeColumn.key !== overColumn.key) {
      const overIndex = isColumnDroppableId(overId)
        ? Math.max(overColumn.tasks.findIndex((t) => t.id === activeId), 0)
        : overColumn.tasks.findIndex((t) => t.id === overId);
      await updateTask.mutateAsync({
        id: activeId,
        projectId,
        status: overColumn.key,
        position: String(Math.max(overIndex, 0)),
      });
      return;
    }

    if (!isColumnDroppableId(overId)) {
      const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
      const overIndex = overColumn.tasks.findIndex((t) => t.id === overId);
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;

      const newTasks = arrayMove(activeColumn.tasks, activeIndex, overIndex);
      const updates = newTasks.map((t, i) => ({ id: t.id, position: String(i) }));
      await reorderTasks.mutateAsync(updates);
    }
  }, [columns, projectId, updateTask, reorderTasks]);

  const handleDragCancel = useCallback(() => {
    setActiveDragTask(null);
  }, []);

  async function handleCreateTask(status: string) {
    const data = newTaskData[status];
    if (!data?.title.trim()) return;

    try {
      await createTask.mutateAsync({
        title: data.title.trim(),
        description: data.description.trim() || null,
        priority: data.priority,
        status,
        projectId,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate || null,
        sprintId: sprintId || null,
      });
      setShowNewTask(null);
      setNewTaskData((prev) => ({ ...prev, [status]: { title: "", description: "", priority: "medium", assigneeId: "", dueDate: "", projectId: "" } }));
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  const taskDetailModal = selectedTask ? (
    <TaskDetailModal
      task={selectedTask}
      users={users}
      currentUserId={currentUserId}
      onClose={() => setSelectedTask(null)}
      onChange={() => {}}
    />
  ) : null;

  if (!dndReady) {
    return (
      <>
        <StaticKanbanBoard columns={columns} onTaskClick={setSelectedTask} />
        {taskDetailModal}
      </>
    );
  }

  return (
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
        className="flex gap-4 overflow-x-auto overscroll-x-contain pb-4"
      >
        {statusColumns.map((colConfig) => {
          const column = columns.find((c) => c.key === colConfig.key) || { ...colConfig, tasks: [] };
          const isAdding = showNewTask === colConfig.key;
          const taskForm = (
            <>
              <button
                onClick={() => setShowNewTask(isAdding ? null : colConfig.key)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                <Plus size={16} />
                {isAdding ? "Cancel" : "Add task"}
              </button>

              {isAdding && (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleCreateTask(colConfig.key); }}
                  className="mt-2 bg-slate-800/50 border border-white/10 rounded-xl p-3 space-y-3 animate-slide-down"
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
                  {!sprintId && (
                    <select
                      value={newTaskData[colConfig.key]?.projectId || projectId}
                      onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], projectId: e.target.value } }))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {allProjects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                  <input
                    type="date"
                    value={newTaskData[colConfig.key]?.dueDate || ""}
                    onChange={(e) => setNewTaskData((prev) => ({ ...prev, [colConfig.key]: { ...prev[colConfig.key], dueDate: e.target.value } }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                      disabled={createTask.isPending}
                      className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition"
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
                onDragStart={() => {}}
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
              "bg-slate-800 border border-brand-500/40 rounded-xl p-3 shadow-2xl cursor-grabbing w-72",
              priorityColors[activeDragTask.priority]
            )}
          >
            <h4 className="text-sm font-medium text-white truncate">{activeDragTask.title}</h4>
          </div>
        ) : null}
      </DragOverlay>

      {taskDetailModal}
    </DndContext>
  );
}