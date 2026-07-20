"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Switch } from "@/components/ui/Switch";
import { Loader2, Save, ToggleLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";

type Flag = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  enabled: boolean;
  updatedAt: string;
};

type FlagsResponse = {
  flags: Flag[];
};

const categoryColors: Record<string, string> = {
  Notifications: "text-sky-400",
  Tracking: "text-emerald-400",
  Security: "text-amber-400",
  Collaboration: "text-violet-400",
  general: "text-slate-400",
};

export default function SuperAdminFeatureFlagsPanel() {
  const queryClient = useQueryClient();
  const [changed, setChanged] = useState<Map<string, boolean>>(new Map());

  const {
    data,
    isLoading,
    error,
  } = useQuery<FlagsResponse>({
    queryKey: ["super-admin-feature-flags"],
    queryFn: () => api.get<FlagsResponse>("/api/super-admin/feature-flags"),
  });

  const updateFlags = useMutation({
    mutationFn: (updates: Array<{ key: string; enabled: boolean }>) =>
      api.patch<FlagsResponse>("/api/super-admin/feature-flags", { updates }),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["super-admin-feature-flags"] });
      const previous = queryClient.getQueryData<FlagsResponse>(["super-admin-feature-flags"]);
      if (previous) {
        queryClient.setQueryData<FlagsResponse>(["super-admin-feature-flags"], {
          flags: previous.flags.map((f) => {
            const u = updates.find((upd) => upd.key === f.key);
            return u ? { ...f, enabled: u.enabled } : f;
          }),
        });
      }
      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["super-admin-feature-flags"], context.previous);
      }
      toast.error("Failed to update feature flags");
    },
    onSuccess: () => {
      setChanged(new Map());
      toast.success("Feature flags updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-feature-flags"] });
    },
  });

  function toggleFlag(key: string, current: boolean) {
    const next = new Map(changed);
    const original = data?.flags.find((f) => f.key === key)?.enabled ?? current;
    const newValue = !current;

    if (newValue === original) {
      next.delete(key);
    } else {
      next.set(key, newValue);
    }
    setChanged(next);

    // Optimistically update local query state for immediate UI feedback
    queryClient.setQueryData<FlagsResponse>(["super-admin-feature-flags"], (old) => {
      if (!old) return old;
      return {
        flags: old.flags.map((f) => (f.key === key ? { ...f, enabled: newValue } : f)),
      };
    });
  }

  function handleSave() {
    if (changed.size === 0) return;
    const updates = Array.from(changed.entries()).map(([key, enabled]) => ({ key, enabled }));
    updateFlags.mutate(updates);
  }

  function getEffectiveEnabled(flag: Flag): boolean {
    if (changed.has(flag.key)) {
      return changed.get(flag.key)!;
    }
    return flag.enabled;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-red-400 py-8">
        Failed to load feature flags. Try refreshing.
      </div>
    );
  }

  const categories = Array.from(new Set(data.flags.map((f) => f.category)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ToggleLeft size={20} className="text-slate-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Feature Flags</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Enable or disable platform features. Changes take effect immediately.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={changed.size === 0 || updateFlags.isPending}
          className={
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition " +
            (changed.size === 0 || updateFlags.isPending
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-brand-500 text-white hover:bg-brand-600")
          }
        >
          {updateFlags.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Changes
        </button>
      </div>

      <div className="space-y-8">
        {categories.map((category) => {
          const catFlags = data.flags.filter((f) => f.category === category);
          return (
            <div key={category}>
              <h3
                className={clsx(
                  "text-sm font-semibold uppercase tracking-wider mb-3",
                  categoryColors[category] ?? "text-slate-400"
                )}
              >
                {category}
              </h3>
              <div className="space-y-3">
                {catFlags.map((flag) => {
                  const effectiveEnabled = getEffectiveEnabled(flag);
                  const hasChanged = changed.has(flag.key);
                  return (
                    <div
                      key={flag.key}
                      className={
                        "flex items-start justify-between gap-4 rounded-lg border p-4 transition " +
                        (hasChanged
                          ? "border-brand-500/30 bg-brand-500/5"
                          : "border-white/5 hover:border-white/10 bg-slate-950/50")
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{flag.label}</span>
                          {hasChanged && (
                            <span className="text-xs text-brand-400 font-medium">
                              Modified
                            </span>
                          )}
                        </div>
                        {flag.description && (
                          <p className="text-xs text-slate-400 mt-1">{flag.description}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Key: <code className="text-slate-400">{flag.key}</code>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 pt-0.5">
                        <Switch
                          checked={effectiveEnabled}
                          onCheckedChange={() => toggleFlag(flag.key, effectiveEnabled)}
                          disabled={updateFlags.isPending}
                        />
                        {flag.updatedAt && (
                          <span className="text-xs text-slate-500">
                            Updated {formatDistanceToNow(new Date(flag.updatedAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
