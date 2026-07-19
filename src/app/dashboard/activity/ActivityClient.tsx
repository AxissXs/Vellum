"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  Loader2,
  RefreshCw,
  Search,
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
import { api } from "@/lib/api";
import {
  useActivityFeed,
  useActivitySummary,
  type ActivityFilters,
  type ActivityItem,
} from "@/hooks/useActivity";
import {
  ENTITY_TYPES,
  activityDayKey,
  entityHref,
  formatActivityDayLabel,
  formatActivityTimeAgo,
  getActivityColor,
  getActivityIcon,
  getInitials,
  severityStyles,
} from "@/lib/activity-ui";

type UserOption = { id: string; name: string };

type DatePreset = "all" | "today" | "7d" | "30d";

function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Stable within a calendar day — do not use wall-clock `now` for `to` (breaks query keys). */
function presetRange(preset: DatePreset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const now = new Date();
  const to = endOfLocalDay(now).toISOString();
  if (preset === "today") {
    return { from: startOfLocalDay(now).toISOString(), to };
  }
  const from = startOfLocalDay(now);
  from.setDate(from.getDate() - (preset === "7d" ? 6 : 29));
  return { from: from.toISOString(), to };
}

export default function ActivityClient() {
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [preset, setPreset] = useState<DatePreset>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const range = useMemo(() => presetRange(preset), [preset]);
  const filters: ActivityFilters = useMemo(
    () => ({
      ...(entityType ? { entityType } : {}),
      ...(userId ? { userId } : {}),
      ...(range.from ? { from: range.from } : {}),
      ...(range.to ? { to: range.to } : {}),
      ...(q ? { q } : {}),
    }),
    [entityType, userId, range, q]
  );

  const summaryFilters: ActivityFilters = useMemo(
    () => ({
      ...(entityType ? { entityType } : {}),
      ...(userId ? { userId } : {}),
      ...(q ? { q } : {}),
    }),
    [entityType, userId, q]
  );

  const { data: usersData } = useQuery({
    queryKey: ["users", "activity-filter"],
    queryFn: () => api.get<{ users: UserOption[] }>("/api/users"),
    staleTime: 60_000,
  });

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
    isFetching: summaryFetching,
  } = useActivitySummary(summaryFilters);

  const {
    data: feedData,
    isLoading: feedLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchFeed,
    isFetching: feedFetching,
  } = useActivityFeed(filters);

  const activities = useMemo(
    () => feedData?.pages.flatMap((p) => p.activities) ?? [],
    [feedData]
  );
  const total = feedData?.pages[0]?.total ?? 0;

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    for (const item of activities) {
      const key = activityDayKey(item.createdAt);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries());
  }, [activities]);

  const chartData =
    summary?.byDay.map((d) => ({
      label: d.date.slice(5),
      count: d.count,
    })) ?? [];

  const topEntity = summary?.byEntityType[0];
  const topActor = summary?.topActors[0];
  const refreshing = summaryFetching || feedFetching;

  function refresh() {
    void refetchSummary();
    void refetchFeed();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
          <p className="text-slate-500 text-sm mt-1">
            Team pulse and recent actions across projects
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={clsx(refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Zap size={16} />}
          label="Today"
          value={summaryLoading ? "—" : String(summary?.today ?? 0)}
          color="text-brand-600"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Last 7 days"
          value={summaryLoading ? "—" : String(summary?.last7d ?? 0)}
          color="text-emerald-600"
        />
        <StatCard
          icon={<Users size={16} />}
          label="Active people (7d)"
          value={summaryLoading ? "—" : String(summary?.activeUsers7d ?? 0)}
          color="text-blue-600"
        />
        <StatCard
          icon={<Activity size={16} />}
          label={topEntity ? `Top: ${topEntity.entityType}` : "Top type"}
          value={
            summaryLoading
              ? "—"
              : topEntity
                ? String(topEntity.count)
                : "0"
          }
          color="text-violet-600"
          hint={topActor ? `${topActor.userName || "Someone"} leads` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Events per day (7d)
          </h3>
          <div className="h-40 w-full">
            {summaryLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : chartData.every((d) => d.count === 0) ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No events in the last 7 days
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" name="Events" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Mix by type (7d)</h3>
          {summaryLoading ? (
            <div className="py-8 flex justify-center text-slate-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : !summary?.byEntityType.length ? (
            <p className="text-sm text-slate-400 py-6 text-center">No breakdown yet</p>
          ) : (
            <ul className="space-y-2">
              {summary.byEntityType.slice(0, 6).map((row) => {
                const max = summary.byEntityType[0]?.count || 1;
                const pct = Math.round((row.count / max) * 100);
                return (
                  <li key={row.entityType}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600 capitalize">{row.entityType}</span>
                      <span className="text-slate-500 tabular-nums">{row.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search details or actions…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">All types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">All people</option>
          {(usersData?.users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as DatePreset)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      {/* Feed */}
      {isError ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center text-sm text-red-600">
          Failed to load activity. Try refresh.
        </div>
      ) : feedLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 flex justify-center text-slate-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Activity size={28} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No activity yet</h3>
          <p className="text-sm text-slate-500">
            {q || entityType || userId || preset !== "all"
              ? "Nothing matches these filters."
              : "Activity will appear here as your team works."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Showing {activities.length} of {total}
          </p>
          {grouped.map(([dayKey, items]) => (
            <div key={dayKey} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
                {formatActivityDayLabel(dayKey)}
              </h3>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                {items.map((log) => (
                  <ActivityRow key={log.id} item={log} nowMs={now} />
                ))}
              </div>
            </div>
          ))}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
      <div className={clsx("flex items-center gap-1.5 text-xs font-medium", color)}>
        {icon}
        <span className="text-slate-500 font-normal truncate">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] text-slate-400 mt-0.5 truncate">{hint}</p> : null}
    </div>
  );
}

function ActivityRow({ item, nowMs }: { item: ActivityItem; nowMs: number }) {
  const Icon = getActivityIcon(item.action, item.entityType);
  const colorClass = getActivityColor(item.action);
  const href = entityHref(item.entityType, item.entityId);
  const severityClass = severityStyles[item.severity] || severityStyles.info;

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div
        className={clsx(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          colorClass
        )}
      >
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {href ? (
            <Link
              href={href}
              className="text-sm text-slate-700 hover:text-brand-600 truncate max-w-full"
            >
              {item.details || item.action}
            </Link>
          ) : (
            <p className="text-sm text-slate-600 truncate">{item.details || item.action}</p>
          )}
          {item.severity && item.severity !== "info" && (
            <span
              className={clsx(
                "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                severityClass
              )}
            >
              {item.severity}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {item.userName || "Unknown"} · {item.entityType}
          {item.tag ? ` · ${item.tag}` : ""} · {formatActivityTimeAgo(item.createdAt, nowMs)}
        </p>
      </div>
      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
        {getInitials(item.userName)}
      </div>
    </div>
  );
}
