"use client";

import { QueryProvider } from "@/providers/QueryProvider";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
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
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-slate-950">
        <Sidebar user={user} />
        <main className="pl-[260px] transition-all duration-200">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between px-6 lg:px-8 py-4">
              <div />
              <NotificationBell />
            </div>
            <div className="px-6 lg:px-8 pb-8">{children}</div>
          </div>
        </main>
      </div>
    </QueryProvider>
  );
}