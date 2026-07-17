"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { clsx } from "clsx";
import { QueryProvider } from "@/providers/QueryProvider";
import { TimezoneProvider } from "@/providers/TimezoneProvider";
import Sidebar from "@/components/Sidebar";
import { BrandLogo } from "@/components/BrandLogo";
import NotificationBell from "@/components/NotificationBell";
import { brand } from "@/lib/brand";

interface DashboardLayoutProps {
  children: ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
  timezone: string;
}

export default function DashboardLayout({
  children,
  user,
  timezone,
}: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <QueryProvider>
      <TimezoneProvider initialTimezone={timezone}>
      <div className="min-h-dvh bg-slate-50">
        <Sidebar
          user={user}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        {/* Mobile backdrop */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <BrandLogo variant="light" className="h-5 w-auto max-w-[120px]" />
            <span className="sr-only">{brand.name}</span>
          </div>
          <NotificationBell />
        </header>

        <main
          className={clsx(
            "pl-0 transition-all duration-200",
            sidebarCollapsed ? "lg:pl-[70px]" : "lg:pl-[260px]"
          )}
        >
          <div className="max-w-[1600px] mx-auto">
            <div className="hidden lg:flex items-center justify-end px-6 lg:px-8 pt-4">
              <NotificationBell />
            </div>
            <div className="p-4 sm:p-6 lg:p-8 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8 lg:pt-2">
              {children}
            </div>
          </div>
        </main>
      </div>
      </TimezoneProvider>
    </QueryProvider>
  );
}
