"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap, AlertTriangle, LogIn, UserCheck } from "lucide-react";
import { clsx } from "clsx";

type ActivityItem = {
  id: string;
  type: "action" | "login" | "login_failed";
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
};

type ActivityStats = {
  logins24h: number;
  failed24h: number;
  activeUsers24h: number;
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function timeAgo(dateStr: string, nowMs: number) {
  if (!nowMs) return "";
  const seconds = Math.floor((nowMs - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SuperAdminActivityPanel() {
  const [now, setNow] = useState(0);

  // Re-render timestamp labels every 30s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data, isLoading, isError, dataUpdatedAt } = useQuery<{
    feed: ActivityItem[];
    stats: ActivityStats;
  }>({
    queryKey: ["super-admin", "activity"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/activity", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load activity");
      return res.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for "real-time" feel
    staleTime: 2000,
  });

  const feed = data?.feed ?? [];
  const stats = data?.stats ?? { logins24h: 0, failed24h: 0, activeUsers24h: 0 };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<LogIn size={18} />}
          label="Logins (24h)"
          value={stats.logins24h.toLocaleString()}
          color="text-brand-600"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Failed Attempts (24h)"
          value={stats.failed24h.toLocaleString()}
          color="text-red-600"
        />
        <StatCard
          icon={<UserCheck size={18} />}
          label="Active Users (24h)"
          value={stats.activeUsers24h.toLocaleString()}
          color="text-emerald-400"
        />
      </div>

      {/* Live Feed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Zap size={16} className="text-amber-600" />
            Live Activity Feed
          </h3>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            {isLoading ? "Loading…" : `Updated ${timeAgo(new Date(dataUpdatedAt).toISOString(), now)}`}
          </span>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Loading activity feed...
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-12 text-red-600 text-sm">
            Failed to load activity feed.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
            <ul className="divide-y divide-slate-100">
              {feed.map((item) => (
                <ActivityRow key={`${item.type}-${item.id}`} item={item} />
              ))}
              {feed.length === 0 && (
                <li className="px-5 py-8 text-center text-slate-500 text-sm">
                  No activity recorded yet.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <span className={clsx(color)}>{icon}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const isLogin = item.type === "login";
  const isFailed = item.type === "login_failed";

  let icon: ReactNode;
  let iconBg: string;

  if (isLogin) {
    icon = <LogIn size={14} />;
    iconBg = "bg-brand-500/10 text-brand-600 border-brand-500/20";
  } else if (isFailed) {
    icon = <AlertTriangle size={14} />;
    iconBg = "bg-red-500/10 text-red-600 border-red-500/20";
  } else {
    icon = <Zap size={14} />;
    iconBg = "bg-amber-500/10 text-amber-600 border-amber-500/20";
  }

  return (
    <li className="flex items-start gap-3 px-5 py-3 hover:bg-brand-50 transition">
      <div
        className={clsx(
          "mt-0.5 h-7 w-7 rounded-full border flex items-center justify-center shrink-0",
          iconBg
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-800 font-medium">
            {item.userName ?? "Unknown"}
          </span>
          <span className="text-xs text-slate-500">{item.userEmail}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {item.details ?? `${item.action}${item.entityType ? ` on ${item.entityType}` : ""}`}
        </p>
        {item.ipAddress && (
          <p className="text-[10px] text-slate-600 mt-0.5">IP: {item.ipAddress}</p>
        )}
      </div>
      <span className="text-[10px] text-slate-600 whitespace-nowrap shrink-0">
        {formatTime(item.createdAt)}
      </span>
    </li>
  );
}
