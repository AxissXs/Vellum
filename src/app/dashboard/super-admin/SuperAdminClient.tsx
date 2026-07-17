"use client";

import { useState } from "react";
import {
  Users,
  Activity,
  KeyRound,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  MessageCircle,
  Globe,
} from "lucide-react";
import { clsx } from "clsx";
import SuperAdminUsersPanel from "./SuperAdminUsersPanel";
import SuperAdminActivityPanel from "./SuperAdminActivityPanel";
import SuperAdminSessionsPanel from "./SuperAdminSessionsPanel";
import SuperAdminAuditPanel from "./SuperAdminAuditPanel";
import SuperAdminHealthPanel from "./SuperAdminHealthPanel";
import SuperAdminRolesPanel from "./SuperAdminRolesPanel";
import SuperAdminTelegramPanel from "./SuperAdminTelegramPanel";
import SuperAdminTimezonePanel from "./SuperAdminTimezonePanel";

const tabs = [
  { id: "users", label: "Users", icon: Users },
  { id: "activity", label: "Live Activity", icon: Activity },
  { id: "sessions", label: "Sessions", icon: KeyRound },
  { id: "audit", label: "Audit Logs", icon: ClipboardList },
  { id: "health", label: "System Health", icon: HeartPulse },
  { id: "roles", label: "Role Matrix", icon: ShieldCheck },
  { id: "telegram", label: "Telegram", icon: MessageCircle },
  { id: "timezone", label: "Locale", icon: Globe },
];

export default function SuperAdminClient() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="space-y-6">
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
                  ? "bg-brand-500/10 text-brand-600 border border-brand-500/20"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {activeTab === "users" && <SuperAdminUsersPanel />}
        {activeTab === "activity" && <SuperAdminActivityPanel />}
        {activeTab === "sessions" && <SuperAdminSessionsPanel />}
        {activeTab === "audit" && <SuperAdminAuditPanel />}
        {activeTab === "health" && <SuperAdminHealthPanel />}
        {activeTab === "roles" && <SuperAdminRolesPanel />}
        {activeTab === "telegram" && <SuperAdminTelegramPanel />}
        {activeTab === "timezone" && <SuperAdminTimezonePanel />}
      </div>
    </div>
  );
}
