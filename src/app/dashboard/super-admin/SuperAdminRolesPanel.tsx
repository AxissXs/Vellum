"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Check, X, Info, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

type Role = {
  id: string;
  name: string;
  description: string;
};

type Permission = {
  id: string;
  label: string;
  category: string;
};

type PermissionsResponse = {
  roles: Role[];
  permissions: Permission[];
  rolePermissions: Record<string, string[]>;
};

export default function SuperAdminRolesPanel() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const { data, isLoading, isError } = useQuery<PermissionsResponse>({
    queryKey: ["super-admin", "permissions"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/permissions", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-dim text-sm">
        <Loader2 size={16} className="animate-spin mr-2" />
        Loading role matrix...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-12 text-red-400 text-sm">
        Failed to load role matrix.
      </div>
    );
  }

  const { roles, permissions, rolePermissions } = data;

  // Group permissions by category
  const categories = permissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {roles.map((role) => {
          const isSelected = selectedRole === role.id;
          const perms = rolePermissions[role.id] ?? [];
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(isSelected ? null : role.id)}
              className={clsx(
                "text-left p-4 rounded-xl border transition",
                isSelected
                  ? "bg-brand-500/5 border-brand-500/30"
                  : "bg-surface-card border-border-subtle hover:border-border-default"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck
                  size={16}
                  className={clsx(
                    isSelected ? "text-brand-400" : "text-text-dim"
                  )}
                />
                <h3 className="text-sm font-semibold text-text-primary">
                  {role.name}
                </h3>
              </div>
              <p className="text-xs text-text-dim leading-relaxed">
                {role.description}
              </p>
              <div className="mt-3 flex items-center gap-1">
                <span className="text-xs text-text-dim">{perms.length}</span>
                <span className="text-xs text-text-dim">permissions</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Permission matrix */}
      <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle bg-overlay-5">
          <h3 className="text-sm font-medium text-text-primary">
            Permission Matrix
          </h3>
          <p className="text-xs text-text-dim mt-0.5">
            Overview of what each role can do across the platform
          </p>
        </div>

        <div className="divide-y divide-white/5">
          {Object.entries(categories).map(([category, perms]) => {
            const isExpanded = expandedCategories.has(category);
            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-text-muted hover:bg-overlay-5 transition"
                >
                  <span>{category}</span>
                  <ChevronDown
                    size={14}
                    className={clsx(
                      "text-text-dim transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border-subtle">
                          <th className="px-5 py-2 font-medium text-text-dim w-1/3">
                            Permission
                          </th>
                          {roles.map((role) => (
                            <th
                              key={role.id}
                              className={clsx(
                                "px-5 py-2 font-medium text-center whitespace-nowrap",
                                selectedRole === role.id
                                  ? "text-brand-400"
                                  : "text-text-dim"
                              )}
                            >
                              {role.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {perms.map((perm) => (
                          <tr
                            key={perm.id}
                            className="hover:bg-overlay-5 transition"
                          >
                            <td className="px-5 py-2.5 text-text-muted">
                              {perm.label}
                            </td>
                            {roles.map((role) => {
                              const hasPerm = (
                                rolePermissions[role.id] ?? []
                              ).includes(perm.id);
                              return (
                                <td
                                  key={role.id}
                                  className={clsx(
                                    "px-5 py-2.5 text-center",
                                    selectedRole === role.id &&
                                      "bg-brand-500/[0.03]"
                                  )}
                                >
                                  {hasPerm ? (
                                    <Check
                                      size={14}
                                      className="mx-auto text-emerald-400"
                                    />
                                  ) : (
                                    <X
                                      size={14}
                                      className="mx-auto text-text-dim"
                                    />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-dim">
        <div className="flex items-center gap-1.5">
          <Check size={12} className="text-emerald-400" />
          <span>Granted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <X size={12} className="text-text-dim" />
          <span>Denied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Info size={12} className="text-text-dim" />
          <span>Click a role card to highlight its column</span>
        </div>
      </div>
    </div>
  );
}
