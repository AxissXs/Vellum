"use client";

import Link from "next/link";
import { useEffect, useState, type ElementType } from "react";
import {
  Activity,
  AlertTriangle,
  CheckSquare,
  FolderKanban,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AuthUser } from "@/lib/auth";
import type { TeamInsightsData } from "@/lib/dashboard-insights";
import {
  entityHref,
  formatActivityTimeAgo,
  getActivityColor,
  getActivityIcon,
} from "@/lib/activity-ui";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  warn,
}: {
  label: string;
  value: number;
  icon: ElementType;
  color: string;
  warn?: boolean;
}) {
  return (
    <div
      className={clsx(
        "bg-white border rounded-xl p-5",
        warn && value > 0 ? "border-red-200" : "border-slate-200"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            color
          )}
        >
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

const statusOrder = ["backlog", "todo", "in_progress", "review", "done"] as const;
const priorityOrder = ["urgent", "high", "medium", "low"] as const;

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

export default function InsightsClient({
  data,
  user,
}: {
  data: TeamInsightsData;
  user: AuthUser;
}) {
  const chartData = data.activity.byDay.map((d) => ({
    label: d.date.slice(5),
    count: d.count,
  }));
  const maxWorkload = Math.max(1, ...data.workload.map((w) => w.count));
  const openPriorityTotal =
    data.priorityBreakdown.reduce((s, p) => s + p.count, 0) || 1;
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
          <p className="text-slate-500 mt-1">
            Team and company performance · {data.todayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/activity"
            className="text-xs text-brand-600 hover:underline"
          >
            Activity feed
          </Link>
          {user.role === "superadmin" && (
            <>
              <span className="text-slate-300">·</span>
              <Link
                href="/dashboard/super-admin"
                className="text-xs text-brand-600 hover:underline"
              >
                Super Admin
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Active projects"
          value={data.pulse.activeProjects}
          icon={FolderKanban}
          color="bg-brand-500/10 text-brand-600"
        />
        <StatCard
          label="Open tasks"
          value={data.pulse.openTasks}
          icon={CheckSquare}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          label="Done this week"
          value={data.pulse.doneThisWeek}
          icon={TrendingUp}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Overdue"
          value={data.pulse.overdue}
          icon={AlertTriangle}
          color="bg-red-500/10 text-red-600"
          warn
        />
        <StatCard
          label="Urgent open"
          value={data.pulse.urgentOpen}
          icon={Zap}
          color="bg-orange-500/10 text-orange-600"
          warn
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Activity (7d)
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div>
              <p className="text-lg font-bold text-slate-900">
                {data.activity.today}
              </p>
              <p className="text-[10px] text-slate-500">Today</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {data.activity.last7d}
              </p>
              <p className="text-[10px] text-slate-500">7 days</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {data.activity.activeUsers7d}
              </p>
              <p className="text-[10px] text-slate-500">Active</p>
            </div>
          </div>
          <div className="h-40 w-full">
            {chartData.every((d) => d.count === 0) ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No activity this week
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Top contributors
            </h3>
          </div>
          {data.activity.topActors.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {data.activity.topActors.map((a, i) => (
                <div key={a.userId} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">
                      {a.userName || "Unknown"}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {a.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-slate-900 text-sm">Workload</h3>
          </div>
          {data.workload.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No open assigned tasks
            </p>
          ) : (
            <div className="space-y-3">
              {data.workload.map((w) => {
                const pct = Math.round((w.count / maxWorkload) * 100);
                return (
                  <div key={w.userId || "unknown"}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 truncate">
                        {w.userName || "Unknown"}
                      </span>
                      <span className="text-slate-500">{w.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">By status</h3>
          <div className="space-y-2">
            {statusOrder.map((status) => {
              const item = data.statusBreakdown.find((d) => d.status === status);
              const count = item?.count || 0;
              const total =
                data.statusBreakdown.reduce((s, d) => s + d.count, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 capitalize">
                      {status.replace(/_/g, " ")}
                    </span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">
            Open by priority
          </h3>
          <div className="space-y-2">
            {priorityOrder.map((p) => {
              const item = data.priorityBreakdown.find((d) => d.priority === p);
              const count = item?.count || 0;
              const pct = Math.round((count / openPriorityTotal) * 100);
              return (
                <div key={p}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 capitalize">{p}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full", priorityColors[p])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-slate-600" />
          <h3 className="font-semibold text-slate-900 text-sm">
            Recent team activity
          </h3>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No recent activity</p>
        ) : (
          <div className="space-y-1">
            {data.recentActivity.map((a) => {
              const Icon = getActivityIcon(a.action, a.entityType);
              const href = entityHref(a.entityType, a.entityId);
              const row = (
                <div className="flex items-start gap-3 py-2">
                  <div
                    className={clsx(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      getActivityColor(a.action)
                    )}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">
                      <span className="font-medium text-slate-800">
                        {a.userName || "Someone"}
                      </span>
                      {" · "}
                      {a.details || a.action}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatActivityTimeAgo(a.createdAt, nowMs)}
                    </p>
                  </div>
                </div>
              );
              return href ? (
                <Link
                  key={a.id}
                  href={href}
                  className="block border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                >
                  {row}
                </Link>
              ) : (
                <div key={a.id} className="border-b border-slate-100 last:border-0">
                  {row}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
