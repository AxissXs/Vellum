"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Loader2,
  Globe,
  Monitor,
  Smartphone,
  Shield,
  Ban,
  UserCheck,
  Clock,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";

type UserDetail = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
    lastIp: string | null;
  };
  sessions: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    success: boolean;
    failedReason: string | null;
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: string | null;
    ipAddress: string | null;
    tag: string | null;
    severity: string;
    createdAt: string;
  }>;
};

const roleBadges: Record<string, string> = {
  superadmin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  admin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  member: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const statusBadges: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactive: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  banned: "bg-red-500/10 text-red-400 border-red-500/20",
};

const severityConfig: Record<string, { dot: string; bg: string }> = {
  info: { dot: "bg-blue-400", bg: "bg-blue-500/10 text-blue-400" },
  warning: { dot: "bg-amber-400", bg: "bg-amber-500/10 text-amber-400" },
  critical: { dot: "bg-red-400", bg: "bg-red-500/10 text-red-400" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTimeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function parseUserAgent(ua: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "Unknown" };

  let browser = "Unknown";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let device = "Desktop";
  if (ua.includes("Mobile") || ua.includes("Android")) device = "Mobile";
  else if (ua.includes("iPad")) device = "Tablet";

  return { browser, os, device };
}

function actionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function UserDetailModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [impersonating, setImpersonating] = useState(false);

  const { data, isLoading, isError } = useQuery<UserDetail>({
    queryKey: ["super-admin", "user-detail", userId],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load user");
      return res.json();
    },
    staleTime: 15 * 1000,
  });

  const updateUser = useMutation({
    mutationFn: async ({ patch }: { patch: Record<string, string> }) => {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "user-detail", userId] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "users"] });
    },
  });

  async function handleImpersonate() {
    setImpersonating(true);
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        credentials: "include",
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      }
    } finally {
      setImpersonating(false);
    }
  }

  const user = data?.user;
  const sessions = data?.sessions ?? [];
  const activity = data?.recentActivity ?? [];

  const successfulLogins = sessions.filter((s) => s.success);
  const failedLogins = sessions.filter((s) => !s.success);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-10"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">User Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
          </div>
        ) : isError || !user ? (
          <div className="flex items-center justify-center py-16 text-red-400">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Failed to load user details.
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Profile Card */}
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-brand-500/20 border-2 border-brand-500/30 flex items-center justify-center text-xl font-bold text-brand-400 flex-shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  getInitials(user.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-semibold text-white">{user.name}</h3>
                  <span className={clsx("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-medium", roleBadges[user.role] || roleBadges.member)}>
                    {user.role}
                  </span>
                  <span className={clsx("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-medium", statusBadges[user.status] || statusBadges.active)}>
                    {user.status}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1">{user.email}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>Joined {formatDate(user.createdAt)}</span>
                  {user.lastLoginAt && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      Last login {formatTimeAgo(user.lastLoginAt)}
                    </span>
                  )}
                  {user.lastIp && (
                    <span className="flex items-center gap-1">
                      <Globe size={11} />
                      {user.lastIp}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={user.role}
                onChange={(e) => updateUser.mutate({ patch: { role: e.target.value } })}
                disabled={updateUser.isPending}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>

              <select
                value={user.status}
                onChange={(e) => updateUser.mutate({ patch: { status: e.target.value } })}
                disabled={updateUser.isPending}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="banned">Banned</option>
              </select>

              {updateUser.isPending && <Loader2 size={14} className="animate-spin text-slate-500" />}

              {user.role !== "superadmin" && (
                <button
                  onClick={handleImpersonate}
                  disabled={impersonating}
                  className="ml-auto flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50"
                >
                  {impersonating ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  Impersonate
                </button>
              )}
            </div>

            {/* Login Sessions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-300">
                  Login Sessions
                  <span className="ml-2 text-xs text-slate-500">
                    {successfulLogins.length} successful, {failedLogins.length} failed
                  </span>
                </h4>
              </div>
              <div className="bg-slate-950/50 rounded-lg border border-white/5 overflow-hidden">
                {sessions.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No login sessions yet.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-4 py-2 font-medium text-slate-500">Status</th>
                          <th className="px-4 py-2 font-medium text-slate-500">IP</th>
                          <th className="px-4 py-2 font-medium text-slate-500">Browser</th>
                          <th className="px-4 py-2 font-medium text-slate-500">OS</th>
                          <th className="px-4 py-2 font-medium text-slate-500">Device</th>
                          <th className="px-4 py-2 font-medium text-slate-500">When</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sessions.map((s) => {
                          const ua = parseUserAgent(s.userAgent);
                          return (
                            <tr key={s.id} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-2">
                                {s.success ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400">
                                    <Check size={12} /> OK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-400" title={s.failedReason || undefined}>
                                    <Ban size={12} /> Fail
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Globe size={10} />
                                  {s.ipAddress || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-400">{ua.browser}</td>
                              <td className="px-4 py-2 text-slate-400">{ua.os}</td>
                              <td className="px-4 py-2 text-slate-400">
                                <span className="flex items-center gap-1">
                                  {ua.device === "Mobile" ? <Smartphone size={10} /> : <Monitor size={10} />}
                                  {ua.device}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-500">{formatTimeAgo(s.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">Recent Activity</h4>
              <div className="bg-slate-950/50 rounded-lg border border-white/5 overflow-hidden">
                {activity.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No activity yet.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                    {activity.map((a) => {
                      const sev = severityConfig[a.severity] || severityConfig.info;
                      return (
                        <div key={a.id} className="px-4 py-3 hover:bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", sev.dot)} />
                            <span className="text-sm text-slate-200">{actionLabel(a.action)}</span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-slate-500">{a.entityType}</span>
                            {a.tag && (
                              <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border", sev.bg)}>
                                {a.tag}
                              </span>
                            )}
                          </div>
                          {a.details && (
                            <p className="text-xs text-slate-500 mt-1 ml-3.5">{a.details}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 ml-3.5 text-[10px] text-slate-600">
                            <span>{formatTimeAgo(a.createdAt)}</span>
                            {a.ipAddress && (
                              <span className="flex items-center gap-1">
                                <Globe size={9} />
                                {a.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
