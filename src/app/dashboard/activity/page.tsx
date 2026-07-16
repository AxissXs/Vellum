import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Activity, FolderKanban, CheckSquare, Users, Settings } from "lucide-react";
import { clsx } from "clsx";

export const dynamic = "force-dynamic";

const actionIcons: Record<string, React.ElementType> = {
  created_project: FolderKanban,
  updated_project: FolderKanban,
  deleted_project: FolderKanban,
  created_task: CheckSquare,
  updated_task: CheckSquare,
  deleted_task: CheckSquare,
  completed_task: CheckSquare,
  started_task: CheckSquare,
  changed_task_status: CheckSquare,
};

const actionColors: Record<string, string> = {
  created_project: "bg-brand-500/10 text-brand-600",
  updated_project: "bg-blue-500/10 text-blue-600",
  deleted_project: "bg-red-500/10 text-red-600",
  created_task: "bg-emerald-500/10 text-emerald-600",
  updated_task: "bg-amber-500/10 text-amber-600",
  deleted_task: "bg-red-500/10 text-red-600",
  completed_task: "bg-emerald-500/10 text-emerald-600",
  started_task: "bg-blue-500/10 text-blue-600",
  changed_task_status: "bg-purple-500/10 text-purple-600",
};

export default async function ActivityPage() {
  const user = await getSession();

  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      details: activityLogs.details,
      createdAt: activityLogs.createdAt,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(50);

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  function formatTime(date: Date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
        <p className="text-slate-500 text-sm mt-1">Recent actions across all projects</p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Activity size={28} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No activity yet</h3>
          <p className="text-sm text-slate-500">Activity will appear here as your team works.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-200">
            {rows.map((log) => {
              const Icon = actionIcons[log.action] || Activity;
              const colorClass = actionColors[log.action] || "bg-slate-500/10 text-slate-500";
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className={clsx("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600">{log.details}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {log.userName || "Unknown"} · {formatTime(log.createdAt)}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                    {getInitials(log.userName)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
