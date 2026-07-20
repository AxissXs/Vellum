"use client";

import Link from "next/link";
import { useEffect, useState, type ElementType } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  Clock,
  Eye,
  MessageSquare,
  Timer,
} from "lucide-react";
import { clsx } from "clsx";
import type { AuthUser } from "@/lib/auth";
import type { PersonalDashboardData } from "@/lib/dashboard-personal";
import {
  entityHref,
  formatActivityTimeAgo,
  getActivityColor,
  getActivityIcon,
} from "@/lib/activity-ui";
import { formatInAppTz } from "@/lib/timezone";

function StatChip({
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

function statusLabel(status: string) {
  if (status === "in_progress") return "In Progress";
  if (status === "review") return "Review";
  return status.replace(/_/g, " ");
}

export default function PersonalDashboard({
  data,
  user,
}: {
  data: PersonalDashboardData;
  user: AuthUser;
}) {
  const firstName = user.name?.split(" ")[0] || "there";
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-slate-500 mt-1">{data.todayLabel} — your day at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatChip
          label="Open tasks"
          value={data.counts.open}
          icon={CheckSquare}
          color="bg-brand-500/10 text-brand-600"
        />
        <StatChip
          label="Due today"
          value={data.counts.dueToday}
          icon={Calendar}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatChip
          label="Overdue"
          value={data.counts.overdue}
          icon={AlertTriangle}
          color="bg-red-500/10 text-red-600"
          warn
        />
        <StatChip
          label="In review"
          value={data.counts.inReview}
          icon={Eye}
          color="bg-purple-500/10 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Due today</h3>
            </div>
            <Link
              href="/dashboard/calendar"
              className="text-xs text-brand-600 hover:underline"
            >
              Calendar
            </Link>
          </div>

          {data.dueTodayTasks.length === 0 && data.schedules.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Nothing due today
            </p>
          ) : (
            <div className="space-y-2">
              {data.dueTodayTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/tasks?taskId=${task.id}`}
                  className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                >
                  <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">{task.title}</p>
                    <p className="text-xs text-slate-500">
                      {statusLabel(task.status)}
                    </p>
                  </div>
                </Link>
              ))}
              {data.schedules.map((s) => (
                <Link
                  key={s.id}
                  href="/dashboard/calendar"
                  className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                >
                  <Clock size={14} className="text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">{s.title}</p>
                    <p className="text-xs text-slate-500">
                      {s.allDay
                        ? "All day"
                        : `${formatInAppTz(s.startsAt, "HH:mm", data.timezone)} – ${formatInAppTz(s.endsAt, "HH:mm", data.timezone)}`}
                      {" · "}
                      {s.type}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} className="text-emerald-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Focus</h3>
            </div>
            <Link
              href="/dashboard/kanban"
              className="text-xs text-brand-600 hover:underline"
            >
              Kanban
            </Link>
          </div>

          {data.focusTasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No tasks in progress or review
            </p>
          ) : (
            <div className="space-y-2">
              {data.focusTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/projects/${task.projectId}?taskId=${task.id}`}
                  className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                >
                  <div
                    className={clsx(
                      "h-2 w-2 rounded-full shrink-0",
                      task.status === "in_progress"
                        ? "bg-blue-400"
                        : "bg-purple-400"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {task.projectName || "Project"}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                      task.status === "in_progress"
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-purple-500/10 text-purple-600"
                    )}
                  >
                    {statusLabel(task.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer size={18} className="text-amber-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Today&apos;s standup
            </h3>
          </div>
          <Link
            href={
              data.standup?.sprintId
                ? `/dashboard/sprints/${data.standup.sprintId}`
                : "/dashboard/sprints"
            }
            className="text-xs text-brand-600 hover:underline"
          >
            {data.standup ? "Open sprint" : "Sprints"}
          </Link>
        </div>

        {!data.standup ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2">
            <p className="text-sm text-slate-500">
              No standup logged for today yet.
            </p>
            <Link
              href="/dashboard/sprints"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 text-white text-sm px-3 py-2 hover:bg-brand-700"
            >
              Log standup
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Yesterday</p>
              <p className="text-slate-700 whitespace-pre-wrap">
                {data.standup.yesterday || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Today</p>
              <p className="text-slate-700 whitespace-pre-wrap">
                {data.standup.today || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Blockers</p>
              <p
                className={clsx(
                  "whitespace-pre-wrap",
                  data.standup.blockers
                    ? "text-amber-700"
                    : "text-slate-700"
                )}
              >
                {data.standup.blockers || "None"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-sky-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Unread notifications
            </h3>
          </div>
          {data.notifications.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">All caught up</p>
          ) : (
            <div className="space-y-2">
              {data.notifications.map((n) => {
                const href = n.url || "#";
                const inner = (
                  <>
                    <p className="text-sm text-slate-700 truncate">{n.title}</p>
                    <p className="text-xs text-slate-500 truncate">{n.content}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatActivityTimeAgo(n.createdAt, nowMs)}
                      {n.actorName ? ` · ${n.actorName}` : ""}
                    </p>
                  </>
                );
                return n.url ? (
                  <Link
                    key={n.id}
                    href={href}
                    className="block py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={n.id}
                    className="py-2 border-b border-slate-100 last:border-0"
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-slate-600" />
              <h3 className="font-semibold text-slate-900 text-sm">
                Your recent activity
              </h3>
            </div>
            <Link
              href="/dashboard/activity"
              className="text-xs text-brand-600 hover:underline"
            >
              All activity
            </Link>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No recent actions</p>
          ) : (
            <div className="space-y-2">
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
    </div>
  );
}
