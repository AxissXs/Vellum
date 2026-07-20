"use client";

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
  Shield,
  ShieldAlert,
  Kanban,
  Timer,
  X,
  Calendar,
  BarChart3,
} from "lucide-react";
import { clsx } from "clsx";
import { brand } from "@/lib/brand";
import { BrandLogo } from "@/components/BrandLogo";
import SidebarMiniCalendar from "@/components/SidebarMiniCalendar";

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
  collapsed = false,
  onCollapsedChange,
}: {
  user: User;
  mobileOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
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
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
    ...(user.role === "superadmin" || user.role === "admin"
      ? [{ href: "/dashboard/insights", label: "Insights", icon: BarChart3 }]
      : []),
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
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
      superadmin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      member: "bg-slate-500/10 text-slate-500 border-slate-500/20",
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
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 transition-all duration-200",
        // On mobile the drawer is always full width; icon-rail only applies from lg+
        collapsed ? "w-[260px] lg:w-[70px]" : "w-[260px]",
        // Off-canvas below lg unless opened; always on-canvas at lg+
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          {collapsed ? (
            <div
              className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center shrink-0 text-white font-bold text-sm"
              title={brand.name}
            >
              {brand.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <BrandLogo variant="light" className="h-6 w-auto max-w-[140px]" />
          )}
        </div>
        {/* Desktop collapse toggle (lg+) */}
        <button
          onClick={() => onCollapsedChange?.(!collapsed)}
          className="ml-auto hidden lg:flex p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        {/* Mobile close button (below lg) */}
        <button
          onClick={onClose}
          className="ml-auto flex lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
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
                  ? "bg-brand-500/10 text-brand-600"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className={clsx("truncate", collapsed && "lg:hidden")}>{item.label}</span>
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-slate-100 text-slate-900 text-xs rounded-md opacity-0 lg:group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 hidden lg:block">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Mini calendar pinned above profile */}
      <div
        className={clsx(
          "shrink-0 px-3 pb-2 border-t border-slate-100",
          collapsed && "lg:hidden"
        )}
      >
        <SidebarMiniCalendar />
      </div>

      {/* User */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <div className={clsx("flex items-center gap-3", collapsed && "lg:justify-center")}>
          <div className="h-9 w-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">
            {getInitials(user.name)}
          </div>
          <div className={clsx("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
            <div className="mt-0.5">{getRoleBadge(user.role)}</div>
          </div>
          <button
            onClick={handleLogout}
            className={clsx(
              "p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-500/10 transition shrink-0",
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
