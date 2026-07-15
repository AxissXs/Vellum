"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useUpdateTask } from "@/hooks/useTasks";
import { toast } from "sonner";

type Sprint = {
  id: string;
  name: string;
  status: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  estimate: number | null;
  dueDate: string | null;
};

const priorityBadges: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-600",
  high: "bg-orange-500/10 text-orange-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-emerald-500/10 text-emerald-600",
};

export default function ProjectBacklogClient({
  projectId,
  initialTasks,
  sprints,
}: {
  projectId: string;
  initialTasks: Task[];
  sprints: Sprint[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const updateTask = useUpdateTask();

  const activeSprint = sprints.find((s) => s.status === "active");
  const plannedSprints = sprints.filter((s) => s.status === "planned");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          projectId,
          status: "backlog",
          priority: "medium",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");
      setTasks((prev) => [
        ...prev,
        {
          id: data.task.id,
          title: data.task.title,
          description: data.task.description,
          status: data.task.status,
          priority: data.task.priority,
          projectId: data.task.projectId,
          assigneeId: data.task.assigneeId,
          assigneeName: null,
          estimate: data.task.estimate ?? null,
          dueDate: data.task.dueDate,
        },
      ]);
      setTitle("");
      toast.success("Task added to backlog");
    } catch {
      toast.error("Failed to create task");
    } finally {
      setAdding(false);
    }
  }

  async function assignToSprint(task: Task, sprintId: string) {
    await updateTask.mutateAsync({
      id: task.id,
      projectId: task.projectId,
      sprintId,
    });
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    toast.success("Task added to sprint");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a backlog item..."
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={adding || !title.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
        >
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add
        </button>
      </form>

      {tasks.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl py-16 text-center">
          <p className="text-slate-500">Backlog is empty.</p>
          <p className="text-sm text-slate-500 mt-1">
            Add tasks here, then pull them into a sprint during planning.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 bg-white/60 border border-slate-200 rounded-xl px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={clsx(
                      "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                      priorityBadges[task.priority] || priorityBadges.medium
                    )}
                  >
                    {task.priority}
                  </span>
                  <span className="text-[10px] text-slate-500 capitalize">{task.status.replace("_", " ")}</span>
                  {task.estimate != null && (
                    <span className="text-[10px] text-slate-500">{task.estimate} pts</span>
                  )}
                  {task.assigneeName && (
                    <span className="text-[10px] text-slate-500">{task.assigneeName}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeSprint && (
                  <button
                    onClick={() => assignToSprint(task, activeSprint.id)}
                    disabled={updateTask.isPending}
                    className="text-xs rounded-lg bg-emerald-500/10 text-emerald-600 px-3 py-1.5 hover:bg-emerald-500/20 transition disabled:opacity-50"
                  >
                    → {activeSprint.name}
                  </button>
                )}
                {plannedSprints.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) assignToSprint(task, e.target.value);
                      e.target.value = "";
                    }}
                    className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Add to sprint...</option>
                    {plannedSprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
