"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Search, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import TaskDetailModal from "@/app/dashboard/projects/[id]/TaskDetailModal";

export type TaskRow = {
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
  sprintId: string | null;
  estimate: number | null;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  projectName: string | null;
  projectColor: string | null;
};

type UserInfo = { id: string; name: string; avatarUrl: string | null };
type ProjectInfo = { id: string; name: string; color: string | null };

const priorityBadges: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-600",
  high: "bg-orange-500/10 text-orange-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-emerald-500/10 text-emerald-600",
};

const statusBadges: Record<string, string> = {
  backlog: "bg-slate-500/10 text-slate-500",
  todo: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-amber-500/10 text-amber-600",
  review: "bg-purple-500/10 text-purple-600",
  done: "bg-emerald-500/10 text-emerald-600",
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

type DueGroupKey = "overdue" | "today" | "this_week" | "later" | "no_due";

const DUE_GROUPS: { key: DueGroupKey; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "this_week", label: "This week" },
  { key: "later", label: "Later" },
  { key: "no_due", label: "No due date" },
];

type SortKey = "dueDate" | "priority" | "updatedAt" | "title";

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfWeek(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + (7 - end.getDay()));
  end.setHours(23, 59, 59, 999);
  return end;
}

function dueGroup(dueDate: string | null, now: Date): DueGroupKey {
  if (!dueDate) return "no_due";
  const due = startOfLocalDay(new Date(dueDate));
  const today = startOfLocalDay(now);
  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  const weekEnd = endOfWeek(today);
  if (due <= weekEnd) return "this_week";
  return "later";
}

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function serializeTask(task: TaskRow): TaskRow {
  return {
    ...task,
    sprintId: task.sprintId ?? null,
    estimate: task.estimate ?? null,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    createdAt: new Date(task.createdAt).toISOString(),
    updatedAt: new Date(task.updatedAt).toISOString(),
  };
}

export default function TasksClient({
  initialTasks,
  users,
  projects,
  currentUserId,
  userRole,
}: {
  initialTasks: TaskRow[];
  users: UserInfo[];
  projects: ProjectInfo[];
  currentUserId: string;
  userRole: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState(() => initialTasks.map(serializeTask));

  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [assigneeId, setAssigneeId] = useState("all");
  const [sort, setSort] = useState<SortKey>("dueDate");

  const taskIdParam = searchParams.get("taskId");
  const taskFromList = taskIdParam
    ? tasks.find((t) => t.id === taskIdParam) ?? null
    : null;

  const {
    data: fetchedTask,
    isLoading: loadingTask,
    isError: fetchError,
  } = useQuery({
    queryKey: ["task", taskIdParam],
    queryFn: async () => {
      const res = await api.get<{ task: TaskRow }>(`/api/tasks/${taskIdParam}`);
      return serializeTask({
        ...res.task,
        projectColor: res.task.projectColor ?? null,
        sprintId: res.task.sprintId ?? null,
        estimate: res.task.estimate ?? null,
      });
    },
    enabled: !!taskIdParam && !taskFromList,
    retry: false,
  });

  useEffect(() => {
    if (!fetchError || !taskIdParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("taskId");
    const qs = params.toString();
    router.replace(qs ? `/dashboard/tasks?${qs}` : "/dashboard/tasks", { scroll: false });
  }, [fetchError, taskIdParam, router, searchParams]);

  const selectedTask = taskFromList ?? fetchedTask ?? null;

  const openTask = useCallback(
    (task: TaskRow) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("taskId", task.id);
      router.replace(`/dashboard/tasks?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const closeTask = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("taskId");
    const qs = params.toString();
    router.replace(qs ? `/dashboard/tasks?${qs}` : "/dashboard/tasks", { scroll: false });
  }, [router, searchParams]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let rows = tasks.filter((t) => {
      if (scope === "mine" && t.assigneeId !== currentUserId) return false;
      if (status !== "all" && t.status !== status) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (projectId !== "all" && t.projectId !== projectId) return false;
      if (assigneeId === "me" && t.assigneeId !== currentUserId) return false;
      if (assigneeId === "unassigned" && t.assigneeId) return false;
      if (
        assigneeId !== "all" &&
        assigneeId !== "me" &&
        assigneeId !== "unassigned" &&
        t.assigneeId !== assigneeId
      ) {
        return false;
      }
      if (query && !t.title.toLowerCase().includes(query)) return false;
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "priority") {
        return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      }
      if (sort === "updatedAt") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return rows;
  }, [tasks, scope, status, priority, projectId, assigneeId, q, sort, currentUserId]);

  const grouped = useMemo(() => {
    const now = new Date();
    const map = new Map<DueGroupKey, TaskRow[]>();
    for (const g of DUE_GROUPS) map.set(g.key, []);
    for (const t of filtered) {
      map.get(dueGroup(t.dueDate, now))!.push(t);
    }
    return map;
  }, [filtered]);

  function handleTaskChange(task: {
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
    sprintId?: string | null;
    estimate?: number | null;
    createdAt: string;
    updatedAt: string;
    assigneeName: string | null;
    assigneeAvatar: string | null;
    projectName?: string | null;
    projectColor?: string | null;
  } | null) {
    if (!task) {
      closeTask();
      return;
    }
    const next = serializeTask({
      ...task,
      sprintId: task.sprintId ?? null,
      estimate: task.estimate ?? null,
      projectName: task.projectName ?? null,
      projectColor: task.projectColor ?? null,
    });
    setTasks((prev) => {
      if (prev.some((t) => t.id === next.id)) {
        return prev.map((t) => (t.id === next.id ? { ...t, ...next } : t));
      }
      return [next, ...prev];
    });
  }

  function handleTaskDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    closeTask();
  }

  const selectClass =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500 text-sm mt-1">
            {filtered.length} shown · {tasks.length} total
            {loadingTask ? " · Opening task…" : ""}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={() => setScope("mine")}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium rounded-md transition",
              scope === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            My tasks
          </button>
          <button
            type="button"
            onClick={() => setScope("all")}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium rounded-md transition",
              scope === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            All
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <label htmlFor="tasks-search" className="sr-only">Search tasks</label>
          <input
            id="tasks-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <label htmlFor="tasks-status" className="sr-only">Status</label>
        <select id="tasks-status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          <option value="all">All statuses</option>
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
        <label htmlFor="tasks-priority" className="sr-only">Priority</label>
        <select id="tasks-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass}>
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <label htmlFor="tasks-project" className="sr-only">Project</label>
        <select id="tasks-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectClass}>
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <label htmlFor="tasks-assignee" className="sr-only">Assignee</label>
        <select id="tasks-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={selectClass}>
          <option value="all">All assignees</option>
          <option value="me">Me</option>
          <option value="unassigned">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <label htmlFor="tasks-sort" className="sr-only">Sort</label>
        <select id="tasks-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
          <option value="dueDate">Sort: Due date</option>
          <option value="priority">Sort: Priority</option>
          <option value="updatedAt">Sort: Updated</option>
          <option value="title">Sort: Title</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            {loadingTask ? (
              <Loader2 size={28} className="text-slate-500 animate-spin" />
            ) : (
              <CheckSquare size={28} className="text-slate-500" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks match</h3>
          <p className="text-sm text-slate-500">Try clearing filters or switching to All.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {DUE_GROUPS.map(({ key, label }) => {
            const groupTasks = grouped.get(key) || [];
            if (groupTasks.length === 0) return null;
            return (
              <div key={key}>
                <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  {label}
                  <span className="text-xs font-normal text-slate-400">{groupTasks.length}</span>
                </h2>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="divide-y divide-slate-200">
                    {groupTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openTask(task)}
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded", statusBadges[task.status])}>
                              {task.status.replace("_", " ")}
                            </span>
                            {task.projectName && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-600">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.projectColor || "#6366f1" }} />
                                {task.projectName}
                              </span>
                            )}
                            {task.assigneeName && (
                              <span className="text-[10px] text-slate-600">· {task.assigneeName}</span>
                            )}
                            {task.estimate != null && (
                              <span className="text-[10px] text-slate-500">{task.estimate} pts</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {task.dueDate && (
                            <span
                              className={clsx(
                                "text-xs",
                                key === "overdue" ? "text-red-600 font-medium" : "text-slate-500"
                              )}
                            >
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                          <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded", priorityBadges[task.priority])}>
                            {task.priority}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          key={selectedTask.id}
          task={selectedTask}
          users={users}
          currentUserId={currentUserId}
          userRole={userRole}
          onClose={closeTask}
          onChange={handleTaskChange}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}
