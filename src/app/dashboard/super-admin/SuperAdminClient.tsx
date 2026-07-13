"use client";

import { useState } from "react";
import {
  Users,
  Activity,
  KeyRound,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import { clsx } from "clsx";
import SuperAdminUsersPanel from "./SuperAdminUsersPanel";

const tabs = [
  { id: "users", label: "Users", icon: Users },
  { id: "activity", label: "Live Activity", icon: Activity },
  { id: "sessions", label: "Sessions", icon: KeyRound },
  { id: "audit", label: "Audit Logs", icon: ClipboardList },
  { id: "health", label: "System Health", icon: HeartPulse },
  { id: "roles", label: "Role Matrix", icon: ShieldCheck },
];

export default function SuperAdminClient() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition whitespace-nowrap",
                isActive
                  ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="bg-slate-900 border border-white/5 rounded-xl p-6">
        {activeTab === "users" && <SuperAdminUsersPanel />}

        {activeTab === "activity" && (
          <div className="text-center py-12">
            <Activity size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">Live Activity</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Real-time feed of logins, failed attempts, and user actions. Coming in Part 3.
            </p>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="text-center py-12">
            <KeyRound size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">Session Management</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              View and revoke active user sessions. Coming in Part 4.
            </p>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="text-center py-12">
            <ClipboardList size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">Audit Logs</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Filterable and exportable audit trail with IP addresses. Coming in Part 5.
            </p>
          </div>
        )}

        {activeTab === "health" && (
          <div className="text-center py-12">
            <HeartPulse size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">System Health</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              DB stats, API latency, and error rates. Coming in Part 6.
            </p>
          </div>
        )}

        {activeTab === "roles" && (
          <div className="text-center py-12">
            <ShieldCheck size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">Role Matrix</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Overview of what each role can do across the platform. Coming in Part 7.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
