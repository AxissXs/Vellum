"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";
import { clsx } from "clsx";
import AuditLogDetailModal from "./AuditLogDetailModal";

type AuditLogItem = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  tag: string | null;
  severity: string;
  createdAt: string;
};

type AuditResponse = {
  logs: AuditLogItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const severityConfig: Record<string, { dot: string; label: string; bg: string }> = {
  info: { dot: "bg-blue-400", label: "Info", bg: "bg-blue-500/10 text-blue-400" },
  warning: { dot: "bg-amber-400", label: "Warning", bg: "bg-amber-500/10 text-amber-400" },
  critical: { dot: "bg-red-400", label: "Critical", bg: "bg-red-500/10 text-red-400" },
};

const tagLabels: Record<string, string> = {
  data_change: "Data Change",
  security: "Security",
  user_action: "User Action",
  impersonation: "Impersonation",
};

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SuperAdminAuditPanel() {
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [ip, setIp] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [detailLogId, setDetailLogId] = useState<string | null>(null);
  const pageSize = 25;

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (userId) p.set("userId", userId);
    if (action) p.set("action", action);
    if (ip) p.set("ip", ip);
    if (tagFilter) p.set("tag", tagFilter);
    if (severityFilter) p.set("severity", severityFilter);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  };

  const { data, isLoading, isError } = useQuery<AuditResponse>({
    queryKey: ["super-admin", "audit", userId, action, ip, tagFilter, severityFilter, from, to, page],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/audit?${buildQuery()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load audit logs");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;

  function exportCSV() {
    const p = new URLSearchParams();
    if (userId) p.set("userId", userId);
    if (action) p.set("action", action);
    if (ip) p.set("ip", ip);
    if (tagFilter) p.set("tag", tagFilter);
    if (severityFilter) p.set("severity", severityFilter);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    p.set("format", "csv");
    window.open(`/api/super-admin/audit/export?${p.toString()}`, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* Tag + Severity Pills */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-text-dim self-center mr-1">Tag:</span>
        {["", "data_change", "security", "user_action", "impersonation"].map((t) => (
          <button
            key={t}
            onClick={() => { setTagFilter(t); setPage(1); }}
            className={clsx(
              "text-xs px-2.5 py-1 rounded-full border transition",
              tagFilter === t
                ? "bg-brand-500/10 text-brand-400 border-brand-500/30"
                : "text-text-dim border-border-default hover:border-border-strong"
            )}
          >
            {t ? tagLabels[t] || t : "All"}
          </button>
        ))}
        <span className="text-text-dim mx-1">|</span>
        <span className="text-xs text-text-dim self-center mr-1">Severity:</span>
        {["", "info", "warning", "critical"].map((s) => (
          <button
            key={s}
            onClick={() => { setSeverityFilter(s); setPage(1); }}
            className={clsx(
              "text-xs px-2.5 py-1 rounded-full border transition flex items-center gap-1",
              severityFilter === s
                ? "bg-brand-500/10 text-brand-400 border-brand-500/30"
                : "text-text-dim border-border-default hover:border-border-strong"
            )}
          >
            {s && <span className={clsx("w-1.5 h-1.5 rounded-full", severityConfig[s]?.dot || "bg-slate-400")} />}
            {s ? severityConfig[s]?.label || s : "All"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-surface-card border border-border-subtle rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-text-dim mb-2">
          <Filter size={14} />
          <span className="text-xs font-medium uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            placeholder="User ID"
            className="rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="text"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            placeholder="Action (e.g. created)"
            className="rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="text"
            value={ip}
            onChange={(e) => { setIp(e.target.value); setPage(1); }}
            placeholder="IP Address"
            className="rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-border-default bg-overlay-5 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-dim">{data?.total ?? 0} total records</span>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 px-3 py-1.5 text-xs font-medium hover:bg-brand-500/20 transition"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-text-dim text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Loading audit logs...
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-12 text-red-400 text-sm">
            Failed to load audit logs.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-overlay-5">
                  <th className="px-5 py-3 font-medium text-text-dim">Action</th>
                  <th className="px-5 py-3 font-medium text-text-dim">Severity</th>
                  <th className="px-5 py-3 font-medium text-text-dim">User</th>
                  <th className="px-5 py-3 font-medium text-text-dim">Entity</th>
                  <th className="px-5 py-3 font-medium text-text-dim">Details</th>
                  <th className="px-5 py-3 font-medium text-text-dim">IP</th>
                  <th className="px-5 py-3 font-medium text-text-dim">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => {
                  const sev = severityConfig[log.severity] || severityConfig.info;
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-overlay-5 transition cursor-pointer"
                      onClick={() => setDetailLogId(log.id)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted font-medium">{log.action}</span>
                          {log.tag && (
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-strong text-text-dim border border-border-subtle">
                              {tagLabels[log.tag] || log.tag}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 w-fit", sev.bg)}>
                          <span className={clsx("w-1.5 h-1.5 rounded-full", sev.dot)} />
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs text-text-muted">{log.userName ?? "System"}</div>
                        <div className="text-[10px] text-text-dim">{log.userEmail}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] uppercase tracking-wider text-text-dim bg-overlay-5 px-1.5 py-0.5 rounded">
                          {log.entityType}
                        </span>
                        {log.entityId && (
                          <div className="text-[10px] text-text-dim mt-0.5 font-mono">{log.entityId.slice(0, 8)}...</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-text-dim max-w-xs truncate">
                        {log.details ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        {log.ipAddress ? (
                          <div className="flex items-center gap-1 text-[10px] text-text-dim">
                            <Globe size={10} />
                            {log.ipAddress}
                          </div>
                        ) : (
                          <span className="text-[10px] text-text-dim">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-text-dim whitespace-nowrap">
                        {formatDateShort(log.createdAt)}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-text-dim text-sm">
                      No audit logs match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 text-xs text-text-dim hover:text-text-primary disabled:opacity-30 transition"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="text-xs text-text-dim">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 text-xs text-text-dim hover:text-text-primary disabled:opacity-30 transition"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailLogId && (
        <AuditLogDetailModal
          logId={detailLogId}
          onClose={() => setDetailLogId(null)}
        />
      )}
    </div>
  );
}
