"use client";

import { QueryProvider } from "@/providers/QueryProvider";
import Sidebar from "@/components/Sidebar";
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
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </QueryProvider>
  );
}