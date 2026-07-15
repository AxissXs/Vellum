"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Shield,
  ShieldAlert,
  Kanban,
  Timer,
  X,
} from "lucide-react";
import { clsx } from "clsx";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};

export default function Sidebar({
  user,
  mobileOpen = false,
  onClose,
}: {
  user: User;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/kanban", label: "Kanban", icon: Kanban },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
    { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/dashboard/teams", label: "Teams", icon: Users },
    { href: "/dashboard/sprints", label: "Sprints", icon: Timer },
    { href: "/dashboard/activity", label: "Activity", icon: Activity },
    ...(user.role === "superadmin" || user.role === "admin"
      ? [{ href: "/dashboard/admin", label: "Admin", icon: Shield }]
      : []),
    ...(user.role === "superadmin"
      ? [{ href: "/dashboard/super-admin", label: "Super Admin", icon: ShieldAlert }]
      : []),
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function getRoleBadge(role: string) {
    const colors: Record<string, string> = {
      superadmin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      admin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      member: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
    return (
      <span
        className={clsx(
          "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
          colors[role] || colors.member
        )}
      >
        {role}
      </span>
    );
  }

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 border-r border-white/5 transition-all duration-200",
        // On mobile the drawer is always full width; icon-rail only applies from lg+
        collapsed ? "w-[260px] lg:w-[70px]" : "w-[260px]",
        // Off-canvas below lg unless opened; always on-canvas at lg+
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          {!collapsed && (
            <span className="font-bold text-white text-lg truncate lg:inline">Vellum</span>
          )}
        </div>
        {/* Desktop collapse toggle (lg+) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden lg:flex p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition flex-shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        {/* Mobile close button (below lg) */}
        <button
          onClick={onClose}
          className="ml-auto flex lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition flex-shrink-0"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition group",
                isActive
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className={clsx("truncate", collapsed && "lg:hidden")}>{item.label}</span>
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 lg:group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 hidden lg:block">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/5">
        <div className={clsx("flex items-center gap-3", collapsed && "lg:justify-center")}>
          <div className="h-9 w-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
            {getInitials(user.name)}
          </div>
          <div className={clsx("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <div className="mt-0.5">{getRoleBadge(user.role)}</div>
          </div>
          <button
            onClick={handleLogout}
            className={clsx(
              "p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition flex-shrink-0",
              collapsed && "lg:hidden"
            )}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
