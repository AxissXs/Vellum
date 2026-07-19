"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, KeyRound, Trash2, Monitor, Clock } from "lucide-react";
import { clsx } from "clsx";

type SessionItem = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  expiresAt: string;
  createdAt: string;
  ipAddress: string | null;
};

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SuperAdminSessionsPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ sessions: SessionItem[] }>({
    queryKey: ["super-admin", "sessions"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
    refetchInterval: 10000, // Poll every 10s
    staleTime: 5000,
  });

  const revokeSession = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/super-admin/sessions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to revoke session");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "sessions"] });
    },
  });

  const sessions = data?.sessions ?? [];

  return (
    <div className="space-y-4">
      {/* Stats card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 inline-flex items-center gap-3">
        <KeyRound size={20} className="text-brand-600" />
        <div>
          <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
          <p className="text-xs text-slate-500">Active sessions</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading active sessions...
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center py-12 text-red-600 text-sm">
          Failed to load sessions.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-brand-50">
                  <th className="px-5 py-3 font-medium text-slate-500">User</th>
                  <th className="px-5 py-3 font-medium text-slate-500 whitespace-nowrap">Role</th>
                  <th className="px-5 py-3 font-medium text-slate-500 whitespace-nowrap">IP</th>
                  <th className="px-5 py-3 font-medium text-slate-500 whitespace-nowrap">Started</th>
                  <th className="px-5 py-3 font-medium text-slate-500 whitespace-nowrap">Expires</th>
                  <th className="px-5 py-3 font-medium text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-brand-50 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-600 shrink-0">
                          {s.userName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "??"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-900 font-medium truncate">{s.userName ?? "Unknown"}</p>
                          <p className="text-xs text-slate-500 truncate">{s.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={clsx(
                        "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
                        s.userRole === "superadmin" && "bg-purple-500/10 text-purple-600 border-purple-500/20",
                        s.userRole === "admin" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                        s.userRole === "member" && "bg-slate-500/10 text-slate-500 border-slate-500/20",
                      )}>
                        {s.userRole ?? "member"}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500">
                      {s.ipAddress ?? "—"}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Monitor size={10} />
                        {timeAgo(s.createdAt)}
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(s.expiresAt)}
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => revokeSession.mutate(s.id)}
                        disabled={revokeSession.isPending}
                        className="inline-flex items-center gap-1 rounded-md bg-red-500/10 text-red-600 border border-red-500/20 px-2.5 py-1.5 text-xs font-medium hover:bg-red-500/15 transition disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-sm">
                      No active sessions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
