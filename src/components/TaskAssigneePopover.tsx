"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, User, Loader2, Check } from "lucide-react";
import { clsx } from "clsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type UserInfo = { id: string; name: string; avatarUrl: string | null };

export default function TaskAssigneePopover({
  taskId,
  currentAssigneeId,
  users,
  size = "md",
  onAssigneeChange,
}: {
  taskId: string;
  currentAssigneeId: string | null;
  users: UserInfo[];
  size?: "sm" | "md";
  onAssigneeChange?: (assigneeId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [localAssigneeId, setLocalAssigneeId] = useState<string | null>(currentAssigneeId);
  const popoverRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (assigneeId: string | null) => {
      const toastId = toast.loading("Updating assignee...");
      try {
        const res = await api.patch<{ task: { assigneeId: string | null; assigneeName: string | null } }>(`/api/tasks/${taskId}`, { assigneeId });
        toast.success(assigneeId ? "User assigned" : "Unassigned", { id: toastId });
        return res.task;
      } catch (err) {
        toast.error("Failed to update assignee", { id: toastId });
        throw err;
      }
    },
    onMutate: async (assigneeId) => {
      // Snapshot current state for both task queries
      const taskIds = queryClient.getQueryCache().findAll({ queryKey: ["tasks"] });
      const prevTasks = new Map();
      for (const q of taskIds) {
        const data = queryClient.getQueryData<{ tasks?: { id: string }[] }>(q.queryKey);
        if (data?.tasks) prevTasks.set(q.queryKey, structuredClone(data));
      }
      setLocalAssigneeId(assigneeId);
      return { prevTasks };
    },
    onError: (err, assigneeId, context) => {
      setLocalAssigneeId(currentAssigneeId);
      if (context?.prevTasks) {
        for (const [key, data] of context.prevTasks) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSuccess: (data) => {
      setLocalAssigneeId(data.assigneeId);
      // Update all task caches
      const taskIds = queryClient.getQueryCache().findAll({ queryKey: ["tasks"] });
      for (const q of taskIds) {
        queryClient.setQueryData(q.queryKey, (old: { tasks?: { id: string; assigneeId?: string | null; assigneeName?: string | null }[] } | undefined) => {
          if (!old?.tasks) return old;
          return {
            ...old,
            tasks: old.tasks.map((t) =>
              t.id === taskId ? { ...t, assigneeId: data.assigneeId, assigneeName: data.assigneeName } : t
            ),
          };
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));
  const selectedUser = users.find((u) => u.id === localAssigneeId);

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  const avatarSize = size === "sm" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]";

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-1 rounded-full transition focus:outline-none focus:ring-2 focus:ring-brand-500/50",
          size === "sm" ? "p-0.5" : "p-1"
        )}
        title={selectedUser ? `Assigned to ${selectedUser.name}` : "Assign user"}
      >
        {selectedUser ? (
          <div className={clsx(avatarSize, "rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center font-bold text-brand-400", mutation.isPending && "opacity-50")}>
            {getInitials(selectedUser.name)}
          </div>
        ) : (
          <div className={clsx(avatarSize, "rounded-full bg-surface-strong border border-dashed border-slate-600 flex items-center justify-center text-text-dim")}>
            <User size={size === "sm" ? 10 : 12} />
          </div>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-surface-card border border-border-default rounded-xl shadow-2xl py-2 animate-slide-in">
          <div className="px-2 pb-1.5">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full rounded-lg border border-border-default bg-overlay-5 pl-7 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto px-1">
            {/* Unassigned option */}
            <button
              onClick={() => {
                mutation.mutate(null);
                setOpen(false);
              }}
              className={clsx(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition",
                localAssigneeId === null || localAssigneeId === undefined
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-text-muted hover:bg-overlay-5 hover:text-text-primary"
              )}
            >
              <div className="h-6 w-6 rounded-full bg-surface-strong border border-dashed border-slate-600 flex items-center justify-center text-text-dim">
                <User size={12} />
              </div>
              <span className="flex-1 text-left truncate">Unassigned</span>
              {(localAssigneeId === null || localAssigneeId === undefined) && <Check size={12} />}
            </button>

            <div className="border-t border-border-subtle my-1" />

            {filtered.length === 0 && (
              <p className="text-xs text-text-dim text-center py-2">No users found</p>
            )}
            {filtered.map((u) => {
              const isSelected = u.id === localAssigneeId;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    mutation.mutate(u.id);
                    setOpen(false);
                  }}
                  className={clsx(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition",
                    isSelected ? "bg-brand-500/10 text-brand-400" : "text-text-muted hover:bg-overlay-5 hover:text-text-primary"
                  )}
                >
                  <div className="h-6 w-6 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-[9px] font-bold text-brand-400">
                    {getInitials(u.name)}
                  </div>
                  <span className="flex-1 text-left truncate">{u.name}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

