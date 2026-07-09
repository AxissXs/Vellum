"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, X, MoreHorizontal, MessageSquare, Calendar, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import TaskDetailModal from "./TaskDetailModal";
import RichTextEditor from "@/components/RichTextEditor";

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

export default function KanbanBoard({
  projectId,
  initialColumns,
  users,
  currentUserId,
}: {
  projectId: string;
  initialColumns: Column[];
  users: User[];
  currentUserId: string;
}) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const router = useRouter();

  // New task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  const refreshTasks = useCallback(async () => {
    router.refresh();
  }, [router]);

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setCreating(true);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        priority: taskPriority,
        status: newTaskStatus,
        projectId,
        assigneeId: taskAssignee || null,
        dueDate: taskDueDate || null,
      }),
    });

    if (res.ok) {
      setShowNewTask(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("medium");
      setTaskAssignee("");
      setTaskDueDate("");
      refreshTasks();
    }
    setCreating(false);
  }

  function handleDragStart(task: Task) {
    setDraggedTask(task);
  }

  function handleDragOver(e: React.DragEvent, columnKey: string) {
    e.preventDefault();
    setDragOverColumn(columnKey);
  }

  async function handleDrop(columnKey: string) {
    setDragOverColumn(null);
    if (!draggedTask) return;
    if (draggedTask.status === columnKey) return;

    // Optimistic update
    setColumns((prev) =>
      prev.map((col) => {
        if (col.key === draggedTask.status) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== draggedTask.id) };
        }
        if (col.key === columnKey) {
          return {
            ...col,
            tasks: [...col.tasks, { ...draggedTask, status: columnKey }],
          };
        }
        return col;
      })
    );

    setDraggedTask(null);

    await fetch(`/api/tasks/${draggedTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: columnKey }),
    });

    refreshTasks();
  }

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return <span className="text-red-400">Overdue</span>;
    if (diffDays === 0) return <span className="text-amber-400">Today</span>;
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `${diffDays}d left`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <>
      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {columns.map((col) => {
          const colDef = statusColumns.find((s) => s.key === col.key)!;
          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-[280px] flex flex-col"
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDrop={() => handleDrop(col.key)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={clsx("h-2.5 w-2.5 rounded-full", colDef.color)} />
                  <h3 className="text-sm font-semibold text-slate-300">{colDef.label}</h3>
                  <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                    {col.tasks.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNewTaskStatus(col.key);
                    setShowNewTask(true);
                  }}
                  className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/5 transition"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Tasks */}
              <div
                className={clsx(
                  "flex-1 space-y-2 min-h-[200px] rounded-xl p-2 transition-colors",
                  dragOverColumn === col.key
                    ? "bg-white/5 ring-1 ring-brand-500/30"
                    : "bg-slate-900/50"
                )}
              >
                {col.tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onClick={() => setSelectedTask(task)}
                    className={clsx(
                      "bg-slate-900 border border-white/5 rounded-lg p-3 cursor-pointer hover:border-white/10 transition border-l-2 shadow-sm",
                      priorityColors[task.priority] || "border-l-slate-600",
                      draggedTask?.id === task.id && "opacity-50"
                    )}
                  >
                    <p className="text-sm text-slate-200 font-medium line-clamp-2">{task.title}</p>

                    <div className="flex items-center justify-between mt-3 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {task.assigneeName ? (
                          <div className="h-6 w-6 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-[10px] font-bold text-brand-400 flex-shrink-0">
                            {getInitials(task.assigneeName)}
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-600 flex-shrink-0">
                            ?
                          </div>
                        )}
                        {task.dueDate && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar size={10} />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      <span className={clsx("text-[10px] uppercase tracking-wider px-1 py-0.5 rounded flex-shrink-0", priorityBadges[task.priority])}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}

                {col.tasks.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-600">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewTask(false)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Create Task</h2>
              <button onClick={() => setShowNewTask(false)} className="p-1 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>

              <RichTextEditor
                label="Description"
                value={taskDescription}
                onChange={setTaskDescription}
                rows={4}
                placeholder="Add acceptance criteria, links, checklists, or implementation notes..."
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Assignee</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creating ? "Creating..." : "Create Task"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onChange={refreshTasks}
        />
      )}
    </>
  );
}
