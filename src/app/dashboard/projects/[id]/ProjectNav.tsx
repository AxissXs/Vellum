"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Kanban, ListTodo } from "lucide-react";

export default function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/projects/${projectId}`;

  const items = [
    { href: base, label: "Board", icon: Kanban, exact: true },
    { href: `${base}/backlog`, label: "Backlog", icon: ListTodo, exact: false },
  ];

  return (
    <div className="flex gap-1 border-b border-white/10">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px",
              isActive
                ? "text-white border-brand-500"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <Icon size={15} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
