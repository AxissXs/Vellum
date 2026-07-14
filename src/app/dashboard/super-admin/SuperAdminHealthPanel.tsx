"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  HeartPulse,
  Users,
  ClipboardList,
  FolderKanban,
  UsersRound,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { clsx } from "clsx";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-slate-900 border border-white/5 rounded-xl p-5 flex items-start justify-between">
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
      <div
        className={clsx(
          "p-2.5 rounded-lg border",
          color
        )}
      >
        <Icon size={18} />
      </div>
    </div>
  );
}

type HealthResponse = {
  activeSessions: number;
  totalUsers: number;
  userStatusBreakdown: Record<string, number>;
  activity24h: number;
  failedLogins24h: number;
  totalTasks: number;
  totalProjects: number;
  totalTeams: number;
  actionBreakdown: { action: string; count: number }[];
};

export default function SuperAdminHealthPanel() {
  const { data, isLoading, isError } = useQuery<HealthResponse>({
    queryKey: ["super-admin", "health"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/health", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load health metrics");
      return res.json();
    },
    refetchInterval: 30000, // Poll every 30s
    staleTime: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
        <Loader2 size={16} className="animate-spin mr-2" />
        Loading system health...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-12 text-red-400 text-sm">
        Failed to load health metrics.
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    inactive: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    banned: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Top stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Sessions"
          value={data.activeSessions}
          icon={HeartPulse}
          color="bg-brand-500/10 text-brand-400 border-brand-500/20"
        />
        <StatCard
          label="Total Users"
          value={data.totalUsers}
          icon={Users}
          color="bg-blue-500/10 text-blue-400 border-blue-500/20"
        />
        <StatCard
          label="Total Tasks"
          value={data.totalTasks}
          icon={ClipboardList}
          color="bg-amber-500/10 text-amber-400 border-amber-500/20"
        />
        <StatCard
          label="Total Projects"
          value={data.totalProjects}
          icon={FolderKanban}
          color="bg-purple-500/10 text-purple-400 border-purple-500/20"
        />
      </div>

      {/* Secondary stats + breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User status breakdown */}
        <div className="bg-slate-900 border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UsersRound size={16} className="text-slate-400" />
            <h3 className="text-sm font-medium text-white">User Status</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(data.userStatusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-slate-400 capitalize">{status}</span>
                <span
                  className={clsx(
                    "text-xs font-medium px-2 py-0.5 rounded-full border",
                    statusColors[status] ??
                      "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  )}
                >
                  {count}
                </span>
              </div>
            ))}
            {Object.keys(data.userStatusBreakdown).length === 0 && (
              <p className="text-sm text-slate-600">No users found.</p>
            )}
          </div>
        </div>

        {/* 24h activity summary */}
        <div className="bg-slate-900 border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-slate-400" />
            <h3 className="text-sm font-medium text-white">Last 24 Hours</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-400">Activities</span>
                <span className="text-sm font-medium text-white">
                  {data.activity24h}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{ width: `${Math.min(data.activity24h * 2, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-400">Failed Logins</span>
                <span
                  className={clsx(
                    "text-sm font-medium",
                    data.failedLogins24h > 0 ? "text-red-400" : "text-white"
                  )}
                >
                  {data.failedLogins24h}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full",
                    data.failedLogins24h > 0 ? "bg-red-500" : "bg-emerald-500"
                  )}
                  style={{
                    width: `${Math.min(data.failedLogins24h * 10, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total Teams</span>
                <span className="text-sm font-medium text-white">
                  {data.totalTeams}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action breakdown */}
        <div className="bg-slate-900 border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={16} className="text-slate-400" />
            <h3 className="text-sm font-medium text-white">Top Actions (24h)</h3>
          </div>
          <div className="space-y-2">
            {data.actionBreakdown.map((item) => (
              <div
                key={item.action}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-slate-400 truncate mr-3">
                  {item.action}
                </span>
                <span className="text-xs font-medium text-white bg-white/5 px-2 py-0.5 rounded-full">
                  {item.count}
                </span>
              </div>
            ))}
            {data.actionBreakdown.length === 0 && (
              <p className="text-sm text-slate-600">No activity in last 24h.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
