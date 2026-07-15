import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tasks, users, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { clsx } from "clsx";

export const dynamic = "force-dynamic";

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

export default async function TasksPage() {
  const user = await getSession();

  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      projectName: projects.name,
      projectColor: projects.color,
      assigneeName: users.name,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .orderBy(tasks.updatedAt);

  const myTasks = taskRows.filter((t) => t.assigneeId === user?.id);
  const allTasks = taskRows;

  function formatDate(date: Date | null) {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
        <p className="text-slate-500 text-sm mt-1">{allTasks.length} total tasks</p>
      </div>

      {/* My Tasks */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">My Tasks</h2>
        {myTasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <CheckSquare size={28} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks assigned to you</h3>
            <p className="text-sm text-slate-500">You don&apos;t have any tasks assigned yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-200">
              {myTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/projects/${task.projectId}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded", statusBadges[task.status])}>
                        {task.status.replace("_", " ")}
                      </span>
                      {task.projectName && (
                        <span className="text-[10px] text-slate-600">{task.projectName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.dueDate && (
                      <span className="text-xs text-slate-500">{formatDate(task.dueDate)}</span>
                    )}
                    <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded", priorityBadges[task.priority])}>
                      {task.priority}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* All Tasks */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">All Tasks</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-200">
            {allTasks.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-slate-500">No tasks yet</p>
              </div>
            ) : (
              allTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/projects/${task.projectId}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded", statusBadges[task.status])}>
                        {task.status.replace("_", " ")}
                      </span>
                      {task.projectName && (
                        <span className="text-[10px] text-slate-600">{task.projectName}</span>
                      )}
                      {task.assigneeName && (
                        <span className="text-[10px] text-slate-600">· {task.assigneeName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.dueDate && (
                      <span className="text-xs text-slate-500">{formatDate(task.dueDate)}</span>
                    )}
                    <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded", priorityBadges[task.priority])}>
                      {task.priority}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
