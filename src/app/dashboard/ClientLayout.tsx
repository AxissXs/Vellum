"use client";

import { QueryProvider } from "@/providers/QueryProvider";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import KeyboardShortcutsHelp from "@/components/KeyboardShortcutsHelp";
import ThemeToggle from "@/components/ThemeToggle";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Keyboard } from "lucide-react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
  isImpersonating?: boolean;
}

export default function DashboardLayout({ children, user, isImpersonating }: DashboardLayoutProps) {
  const { helpOpen, toggleHelp, closeHelp } = useKeyboardShortcuts();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function handleNewTask() {
      const isKanban = pathname === "/dashboard/kanban" || /^\/dashboard\/projects\/[^/]+$/.test(pathname);
      if (!isKanban) {
        router.push("/dashboard/kanban");
      }
    }
    window.addEventListener("keyboard:new-task", handleNewTask);
    return () => window.removeEventListener("keyboard:new-task", handleNewTask);
  }, [pathname, router]);

  return (
    <QueryProvider>
      <div className="min-h-screen bg-surface-page">
        <Sidebar user={user} />
        <main className="pl-[260px] transition-all duration-200">
          <div className="max-w-[1600px] mx-auto">
            {isImpersonating && <ImpersonationBanner targetName={user.name} />}
            <div className="flex items-center justify-between px-6 lg:px-8 py-4">
              <div />
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleHelp}
                  className="p-2 text-text-dim hover:text-text-primary hover:bg-overlay-10 rounded-lg transition"
                  aria-label="Keyboard shortcuts"
                  title="Keyboard shortcuts (?)">
                  <Keyboard size={20} />
                </button>
                <ThemeToggle />
                <NotificationBell />
              </div>
            </div>
            <div className="px-6 lg:px-8 pb-8">{children}</div>
          </div>
        </main>
      </div>
      <KeyboardShortcutsHelp open={helpOpen} onClose={closeHelp} />
    </QueryProvider>
  );
}
