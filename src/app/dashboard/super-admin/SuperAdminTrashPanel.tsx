"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  Filter,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";

type TrashItem = {
  type: string;
  id: string;
  title: string;
  deletedAt: string;
  deletedBy: { id: string; name: string; email: string } | null;
  extra?: { projectName?: string };
};

type TrashResponse = {
  items: TrashItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const typeLabels: Record<string, string> = {
  task: "Task",
  project: "Project",
  comment: "Comment",
  team: "Team",
  milestone: "Milestone",
  note: "Note",
  teamMember: "Team Member",
};

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SuperAdminTrashPanel() {
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmRestore, setConfirmRestore] = useState(false);
  const pageSize = 25;
  const queryClient = useQueryClient();

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    if (search) p.set("search", search);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  };

  const { data, isLoading, isError } = useQuery<TrashResponse>({
    queryKey: ["super-admin", "trash", type, search, page],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/trash?${buildQuery()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load trash");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const items = data?.items ?? [];

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const restoreMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/super-admin/restore", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          entities: ids.map((id) => {
            const item = items.find((i) => i.id === id);
            return { type: item?.type || "task", id };
          }),
        }),
      });
      if (!res.ok) throw new Error("Restore failed");
      return res.json();
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["super-admin", "trash"] });
      const previous = queryClient.getQueryData<TrashResponse>([
        "super-admin",
        "trash",
        type,
        search,
        page,
      ]);
      queryClient.setQueryData<TrashResponse>(
        ["super-admin", "trash", type, search, page],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((i) => !ids.includes(i.id)),
            total: old.total - ids.length,
          };
        }
      );
      setSelectedIds(new Set());
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["super-admin", "trash", type, search, page],
          context.previous
        );
      }
      toast.error("Failed to restore items");
    },
    onSuccess: (data) => {
      toast.success(`Restored ${data.restored} item(s)`);
      setConfirmRestore(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "trash"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "health"] });
    },
  });

  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16 text-red-400">
        <AlertTriangle className="h-5 w-5 mr-2" />
        Failed to load trash.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-white/5">
          <Filter size={14} className="text-slate-500" />
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-sm text-slate-200 outline-none"
          >
            <option value="">All Types</option>
            {Object.entries(typeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-white/5">
          <Search size={14} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-sm text-slate-200 outline-none w-40"
          />
        </div>

        <div className="flex-1" />

        {selectedIds.size > 0 && (
          <button
            onClick={() => setConfirmRestore(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 text-sm font-medium hover:bg-emerald-500/20 transition"
          >
            <RotateCcw size={14} />
            Restore {selectedIds.size} selected
          </button>
        )}
      </div>

      {/* Table */}
      <div className="border border-white/5 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 border-b border-white/5 text-left">
              <th className="px-4 py-3 w-10">
                <button onClick={toggleAll} className="text-slate-400 hover:text-slate-200">
                  {selectedIds.size === items.length && items.length > 0 ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                Title / Name
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                Deleted By
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                Deleted At
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Trash2 className="h-8 w-8 text-slate-600" />
                    <p className="text-slate-400">Trash is empty</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={`${item.type}-${item.id}`}
                  className={clsx(
                    "hover:bg-white/[0.02] transition",
                    selectedIds.has(item.id) && "bg-brand-500/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleSelection(item.id)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      {selectedIds.has(item.id) ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-white/5">
                      {typeLabels[item.type] || item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-200 truncate max-w-xs">{item.title}</p>
                    {item.extra?.projectName && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Project: {item.extra.projectName}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {item.deletedBy?.name || "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {formatDateShort(item.deletedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelectedIds(new Set([item.id]));
                        setConfirmRestore(true);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {data.total} items total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-white/5 text-slate-400 hover:text-slate-200 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-slate-400 px-2">
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="p-1.5 rounded-lg border border-white/5 text-slate-400 hover:text-slate-200 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <RotateCcw size={18} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Restore Items</h3>
                <p className="text-sm text-slate-400">
                  Are you sure you want to restore {selectedIds.size} item(s)?
                </p>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1 mb-4 bg-slate-800/50 rounded-lg p-3">
              {selectedItems.map((item) => (
                <div key={item.id} className="text-sm text-slate-300 flex items-center gap-2">
                  <span className="text-xs text-slate-500">{typeLabels[item.type]}</span>
                  <span className="truncate">{item.title}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmRestore(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => restoreMutation.mutate(Array.from(selectedIds))}
                disabled={restoreMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 text-sm font-medium transition disabled:opacity-50"
              >
                {restoreMutation.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
