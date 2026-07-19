"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
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

const severityConfig: Record<string, { dot: string; bg: string; label: string }> = {
  info: { dot: "bg-blue-400", bg: "bg-blue-500/10 text-blue-600", label: "Info" },
  warning: { dot: "bg-amber-400", bg: "bg-amber-500/10 text-amber-600", label: "Warning" },
  critical: { dot: "bg-red-400", bg: "bg-red-500/10 text-red-600", label: "Critical" },
};

const tagLabels: Record<string, string> = {
  data_change: "Data Change",
  security: "Security",
  user_action: "User Action",
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
  const [tag, setTag] = useState("");
  const [severity, setSeverity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const pageSize = 25;

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (userId) p.set("userId", userId);
    if (action) p.set("action", action);
    if (ip) p.set("ip", ip);
    if (tag) p.set("tag", tag);
    if (severity) p.set("severity", severity);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  };

  const { data, isLoading, isError } = useQuery<AuditResponse>({
    queryKey: ["super-admin", "audit", userId, action, ip, tag, severity, from, to, page],
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
    if (tag) p.set("tag", tag);
    if (severity) p.set("severity", severity);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    p.set("format", "csv");
    window.open(`/api/super-admin/audit/export?${p.toString()}`, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <Filter size={14} />
          <span className="text-xs font-medium uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            placeholder="User ID"
            className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="text"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            placeholder="Action (e.g. created)"
            className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="text"
            value={ip}
            onChange={(e) => { setIp(e.target.value); setPage(1); }}
            placeholder="IP Address"
            className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={tag}
            onChange={(e) => { setTag(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All tags</option>
            <option value="data_change">Data Change</option>
            <option value="security">Security</option>
            <option value="user_action">User Action</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{data?.total ?? 0} total records</span>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/10 text-brand-600 border border-brand-500/20 px-3 py-1.5 text-xs font-medium hover:bg-brand-500/20 transition"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Loading audit logs...
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-12 text-red-600 text-sm">
            Failed to load audit logs.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-brand-50">
                  <th className="px-5 py-3 font-medium text-slate-500">Action</th>
                  <th className="px-5 py-3 font-medium text-slate-500">User</th>
                  <th className="px-5 py-3 font-medium text-slate-500">Entity</th>
                  <th className="px-5 py-3 font-medium text-slate-500">Tag</th>
                  <th className="px-5 py-3 font-medium text-slate-500">Severity</th>
                  <th className="px-5 py-3 font-medium text-slate-500">IP</th>
                  <th className="px-5 py-3 font-medium text-slate-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const sev = severityConfig[log.severity] || severityConfig.info;
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-brand-50 transition cursor-pointer"
                      onClick={() => setSelectedLogId(log.id)}
                    >
                      <td className="px-5 py-3">
                        <span className="text-xs text-slate-600 font-medium">{log.action}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs text-slate-600">{log.userName ?? "System"}</div>
                        <div className="text-[10px] text-slate-500">{log.userEmail}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {log.entityType}
                        </span>
                        {log.entityId && (
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            {log.entityId.slice(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {log.tag && (
                          <span className="text-[10px] uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {tagLabels[log.tag] || log.tag}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded", sev.bg)}>
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {log.ipAddress ? (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Globe size={10} />
                            {log.ipAddress}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateShort(log.createdAt)}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500 text-sm">
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30 transition"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30 transition"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLogId && (
        <AuditLogDetailModal
          logId={selectedLogId}
          onClose={() => setSelectedLogId(null)}
        />
      )}
    </div>
  );
}
