"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronDown, ChevronUp, Loader2, Shield, Ban, UserCheck, Clock } from "lucide-react";
import { clsx } from "clsx";
import UserDetailModal from "./UserDetailModal";

export type SuperAdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  lastSeenIp: string | null;
  createdAt: string;
  updatedAt: string;
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
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const roleBadges: Record<string, string> = {
  superadmin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  member: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const statusBadges: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  inactive: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  banned: "bg-red-500/10 text-red-600 border-red-500/20",
};

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

export default function SuperAdminUsersPanel() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "createdAt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ users: SuperAdminUser[] }>({
    queryKey: ["super-admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const users = data?.users ?? [];

  const updateUser = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, string> }) => {
      const res = await fetch(`/api/super-admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update user");
      }
      return res.json();
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["super-admin", "users"] });
      const previous = queryClient.getQueryData<{ users: SuperAdminUser[] }>(["super-admin", "users"]);
      queryClient.setQueryData<{ users: SuperAdminUser[] }>(["super-admin", "users"], (old) => {
        if (!old) return old;
        return {
          users: old.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["super-admin", "users"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "users"] });
    },
  });

  function toggleSort(column: "name" | "createdAt") {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  let filtered = users;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  if (roleFilter !== "all") {
    filtered = filtered.filter((u) => u.role === roleFilter);
  }

  if (statusFilter !== "all") {
    filtered = filtered.filter((u) => u.status === statusFilter);
  }

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "name") {
      return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sortDir === "asc" ? ta - tb : tb - ta;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Loading users...
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-12 text-red-600 text-sm">
            Failed to load users.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white/[0.02]">
                  <th className="px-5 py-3 font-medium text-slate-500">User</th>
                  <th className="px-5 py-3 font-medium text-slate-500 whitespace-nowrap">Role</th>
                  <th className="px-5 py-3 font-medium text-slate-500 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 font-medium text-slate-500 whitespace-nowrap">Last Seen</th>
                  <th
                    className="px-5 py-3 font-medium text-slate-500 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => toggleSort("createdAt")}
                  >
                    Created {sortBy === "createdAt" && (sortDir === "asc" ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />)}
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-brand-50 transition cursor-pointer" onClick={() => setSelectedUserId(u.id)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-600 shrink-0">
                          {getInitials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{u.name}</p>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border", roleBadges[u.role] || roleBadges.member)}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border", statusBadges[u.status] || statusBadges.active)}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-slate-500 text-xs">
                      {u.lastSeenAt ? (
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatTimeAgo(u.lastSeenAt)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Role changer */}
                        <select
                          value={u.role}
                          onChange={(e) => updateUser.mutate({ id: u.id, patch: { role: e.target.value } })}
                          disabled={updateUser.isPending}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          title="Change role"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Superadmin</option>
                        </select>

                        {/* Status changer */}
                        <select
                          value={u.status}
                          onChange={(e) => updateUser.mutate({ id: u.id, patch: { status: e.target.value } })}
                          disabled={updateUser.isPending}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          title="Change status"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="banned">Banned</option>
                        </select>

                        {updateUser.isPending && (
                          <Loader2 size={14} className="animate-spin text-slate-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-sm">
                      No users match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
