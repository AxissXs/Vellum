"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Loader2,
  Globe,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";

type AuditLogDetail = {
  log: {
    id: string;
    userId: string;
    userName: string | null;
    userEmail: string | null;
    userAvatar: string | null;
    userRole: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    details: string | null;
    ipAddress: string | null;
    tag: string | null;
    severity: string;
    createdAt: string;
  };
  snapshots: Array<{
    tableName: string;
    recordId: string;
    snapshotType: string;
    snapshot: Record<string, unknown>;
  }>;
  actor: {
    id: string | null;
    name: string | null;
    email: string | null;
    role: string | null;
    avatarUrl: string | null;
    lastLoginAt: string | null;
    lastIp: string | null;
  };
  entity: {
    exists: boolean;
    current: Record<string, unknown> | null;
  };
  timeline: Array<{
    id: string;
    action: string;
    userName: string | null;
    details: string | null;
    severity: string;
    createdAt: string;
  }>;
};

const severityConfig: Record<
  string,
  { dot: string; label: string; bg: string }
> = {
  info: {
    dot: "bg-blue-400",
    label: "Info",
    bg: "bg-blue-500/10 text-blue-600",
  },
  warning: {
    dot: "bg-amber-400",
    label: "Warning",
    bg: "bg-amber-500/10 text-amber-600",
  },
  critical: {
    dot: "bg-red-400",
    label: "Critical",
    bg: "bg-red-500/10 text-red-600",
  },
};

const tagLabels: Record<string, string> = {
  data_change: "Data Change",
  security: "Security",
  user_action: "User Action",
};

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
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SnapshotDiff({
  before,
  after,
}: {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}) {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changedKeys = Array.from(allKeys).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])
  );

  if (changedKeys.length === 0) {
    return <p className="text-xs text-slate-400">No field changes detected.</p>;
  }

  return (
    <div className="space-y-1">
      {changedKeys.map((key) => (
        <div key={key} className="flex items-start gap-2 text-xs">
          <span className="text-slate-500 font-mono min-w-[120px] shrink-0">
            {key}
          </span>
          <span className="text-red-500 line-through truncate max-w-[200px]">
            {String(before[key] ?? "null")}
          </span>
          <span className="text-emerald-600 truncate max-w-[200px]">
            {String(after[key] ?? "null")}
          </span>
        </div>
      ))}
    </div>
  );
}

function SnapshotCard({
  label,
  snapshot,
}: {
  label: string;
  snapshot: Record<string, unknown>;
}) {
  const fields = Object.entries(snapshot).filter(
    ([k]) =>
      !["createdAt", "updatedAt", "deletedAt", "deletedBy"].includes(k)
  );
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
        {label}
      </p>
      <div className="space-y-1">
        {fields.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="text-slate-500 font-mono min-w-[100px] shrink-0">
              {key}
            </span>
            <span className="text-slate-700 truncate max-w-[300px]">
              {value === null
                ? "null"
                : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditLogDetailModal({
  logId,
  onClose,
}: {
  logId: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const { data, isLoading, isError } = useQuery<AuditLogDetail>({
    queryKey: ["super-admin", "audit-detail", logId],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/audit/${logId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load audit log detail");
      return res.json();
    },
    staleTime: 60_000,
  });

  const copyIP = () => {
    if (data?.log.ipAddress) {
      navigator.clipboard.writeText(data.log.ipAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const severity =
    severityConfig[data?.log.severity || "info"] || severityConfig.info;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-10">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Audit Log Detail
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : isError || !data ? (
          <div className="flex items-center justify-center py-16 text-red-500">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Failed to load log detail.
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Actor Section */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500 flex-shrink-0">
                {data.actor.avatarUrl ? (
                  <img
                    src={data.actor.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  (data.actor.name || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {data.actor.name || "Unknown"}
                  </h3>
                  {data.actor.role && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                      {data.actor.role}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{data.actor.email}</p>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Globe size={12} />
                    {data.log.ipAddress || "unknown"}
                    <button
                      onClick={copyIP}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      {copied ? (
                        <Check size={12} className="text-emerald-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </span>
                  <span>{formatDate(data.log.createdAt)}</span>
                  <span>{formatTimeAgo(data.log.createdAt)}</span>
                </div>
                {data.actor.lastLoginAt && (
                  <p className="text-xs text-slate-400 mt-1">
                    Last login: {formatDate(data.actor.lastLoginAt)}
                    {data.actor.lastIp && ` from ${data.actor.lastIp}`}
                  </p>
                )}
              </div>
            </div>

            {/* Event Summary */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm text-slate-900">
                  {data.log.action}
                </span>
                <span
                  className={clsx(
                    "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                    severity.bg
                  )}
                >
                  {severity.label}
                </span>
                {data.log.tag && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                    {tagLabels[data.log.tag] || data.log.tag}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700">{data.log.details}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span className="text-slate-600">{data.log.entityType}</span>
                {data.log.entityId && (
                  <span className="font-mono">
                    {data.log.entityId.slice(0, 8)}...
                  </span>
                )}
                {data.entity.exists && data.log.entityId && (
                  <a
                    href={`/dashboard/tasks?taskId=${data.log.entityId}`}
                    className="text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View <ExternalLink size={10} />
                  </a>
                )}
                {!data.entity.exists && (
                  <span className="text-slate-400">
                    Entity no longer exists
                  </span>
                )}
              </div>
            </div>

            {/* Entity Card */}
            {data.entity.current && (
              <SnapshotCard
                label="Current State"
                snapshot={data.entity.current}
              />
            )}

            {/* Snapshots Toggle */}
            {data.snapshots.length > 0 && (
              <div>
                <button
                  onClick={() => setShowSnapshots(!showSnapshots)}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition"
                >
                  {showSnapshots ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  Snapshots ({data.snapshots.length})
                </button>
                {showSnapshots && (
                  <div className="mt-3 space-y-3">
                    {data.snapshots.length === 2 &&
                    data.snapshots[0].snapshotType === "before" &&
                    data.snapshots[1].snapshotType === "after" ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                          Changes
                        </p>
                        <SnapshotDiff
                          before={data.snapshots[0].snapshot}
                          after={data.snapshots[1].snapshot}
                        />
                      </div>
                    ) : (
                      data.snapshots.map((s, i) => (
                        <SnapshotCard
                          key={i}
                          label={`${s.snapshotType} snapshot (${s.tableName})`}
                          snapshot={s.snapshot}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Entity Timeline */}
            {data.timeline.length > 0 && (
              <div>
                <button
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition"
                >
                  {showTimeline ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  Entity History ({data.timeline.length} events)
                </button>
                {showTimeline && (
                  <div className="mt-3 space-y-0 border-l border-slate-200 ml-2">
                    {data.timeline.map((t) => {
                      const s =
                        severityConfig[t.severity] || severityConfig.info;
                      return (
                        <div key={t.id} className="relative pl-4 py-2">
                          <div
                            className={clsx(
                              "absolute left-0 top-3 w-2 h-2 rounded-full -translate-x-1",
                              s.dot
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-700">
                              {t.action}
                            </span>
                            <span
                              className={clsx(
                                "text-[9px] uppercase px-1 py-0.5 rounded",
                                s.bg
                              )}
                            >
                              {s.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {t.details}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span>{t.userName || "System"}</span>
                            <span>{formatTimeAgo(t.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
