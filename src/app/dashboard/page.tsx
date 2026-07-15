import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks, teams, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  FolderKanban,
  CheckSquare,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSession();

  // Stats
  const [projectCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.archived, false));

  const [taskCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks);

  const [doneCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(eq(tasks.status, "done"));

  const [teamCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(teams);

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  const completionRate = taskCount.count > 0
    ? Math.round((doneCount.count / taskCount.count) * 100)
    : 0;

  // Priority breakdown
  const priorityData = await db
    .select({
      priority: tasks.priority,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .groupBy(tasks.priority);

  // Recent projects
  const recentProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.archived, false))
    .orderBy(projects.createdAt)
    .limit(4);

  // Active tasks (in progress + review)
  const activeTasks = await db
    .select()
    .from(tasks)
    .where(
      sql`${tasks.status} IN ('in_progress', 'review')`
    )
    .orderBy(tasks.updatedAt)
    .limit(5);

  // Get user names for tasks
  const userIds = [...new Set(activeTasks.map(t => t.assigneeId).filter(Boolean))];
  const userRows = userIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users)
    : [];
  const userMap = new Map(userRows.map(u => [u.id, u.name]));

  const stats = [
    { label: "Active Projects", value: projectCount.count, icon: FolderKanban, color: "bg-brand-500/10 text-brand-600" },
    { label: "Total Tasks", value: taskCount.count, icon: CheckSquare, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Teams", value: teamCount.count, icon: Users, color: "bg-blue-500/10 text-blue-600" },
    { label: "Team Members", value: userCount.count, icon: Users, color: "bg-amber-500/10 text-amber-600" },
  ];

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
  };

  const priorityLabels: Record<string, string> = {
    urgent: "Urgent",
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening across your teams today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-200 transition">
              <div className="flex items-center gap-3">
                <div className={clsx("h-10 w-10 rounded-xl flex items-center justify-center", stat.color)}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-slate-900 text-sm">Completion Rate</h3>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-32 w-32">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
                <circle
                  cx="64" cy="64" r="56"
                  fill="none" stroke="rgb(51 65 85)" strokeWidth="12"
                />
                <circle
                  cx="64" cy="64" r="56"
                  fill="none" stroke="#6366f1" strokeWidth="12"
                  strokeDasharray={`${(completionRate / 100) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold text-slate-900">{completionRate}%</span>
                  <p className="text-[10px] text-slate-500">complete</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">
            {doneCount.count} of {taskCount.count} tasks completed
          </p>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="font-semibold text-slate-900 text-sm">By Priority</h3>
          </div>
          <div className="space-y-3">
            {(["urgent", "high", "medium", "low"] as const).map((p) => {
              const item = priorityData.find((d) => d.priority === p);
              const count = item?.count || 0;
              const total = taskCount.count || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={p}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{priorityLabels[p]}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full transition-all", priorityColors[p])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Tasks */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900 text-sm">Active Tasks</h3>
          </div>
          {activeTasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No active tasks</p>
          ) : (
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-2 border-b border-slate-200 last:border-0">
                  <div
                    className={clsx(
                      "h-2 w-2 rounded-full flex-shrink-0",
                      task.status === "in_progress" ? "bg-blue-400" : "bg-purple-400"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-600 truncate">{task.title}</p>
                    {task.assigneeId && (
                      <p className="text-xs text-slate-600">{userMap.get(task.assigneeId) || "Unassigned"}</p>
                    )}
                  </div>
                  <span className={clsx(
                    "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                    task.status === "in_progress"
                      ? "bg-blue-500/10 text-blue-600"
                      : "bg-purple-500/10 text-purple-600"
                  )}>
                    {task.status === "in_progress" ? "In Progress" : "Review"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentProjects.map((project) => (
            <a
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-200 transition group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-900 text-lg"
                  style={{ backgroundColor: project.color || "#6366f1" }}
                >
                  📁
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm truncate group-hover:text-brand-600 transition">
                    {project.name}
                  </h3>
                </div>
              </div>
              {project.description && (
                <p className="text-xs text-slate-500 line-clamp-2">{project.description}</p>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
