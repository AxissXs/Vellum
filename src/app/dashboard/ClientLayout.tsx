"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { QueryProvider } from "@/providers/QueryProvider";
import Sidebar from "@/components/Sidebar";
import { BrandLogo } from "@/components/BrandLogo";
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
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <QueryProvider>
      <div className="min-h-dvh bg-slate-50">
        <Sidebar
          user={user}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
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
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo variant="light" className="h-5 w-auto max-w-[120px]" />
            <span className="sr-only">{brand.name}</span>
          </div>
        </header>

        <main className="pl-0 lg:pl-[260px] transition-all duration-200">
          <div className="p-4 sm:p-6 lg:p-8 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </QueryProvider>
  );
}
