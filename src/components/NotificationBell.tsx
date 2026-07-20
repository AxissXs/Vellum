"use client";

import { clsx } from "clsx";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead, isLoading } = useNotifications();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          "relative p-2 rounded-lg transition",
          "text-text-dim hover:text-text-primary hover:bg-overlay-5"
        )}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 text-text-primary rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[480px] bg-surface-card border border-border-default rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-xs text-text-dim hover:text-text-primary flex items-center gap-1 transition"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-text-dim text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-text-dim text-sm">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={clsx(
                      "px-4 py-3 hover:bg-overlay-5 transition group",
                      !n.read && "bg-overlay-5"
                    )}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                      if (n.url) {
                        router.push(n.url);
                        setOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={clsx(
                          "mt-0.5 w-2 h-2 rounded-full flex-shrink-0",
                          n.read ? "bg-transparent" : "bg-brand-400"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={clsx(
                            "text-sm leading-snug",
                            n.read ? "text-text-dim" : "text-text-secondary"
                          )}
                        >
                          {n.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[11px] text-text-dim">
                            {formatTimeAgo(n.createdAt)}
                          </p>
                          {n.url && (
                            <ExternalLink size={10} className="text-text-dim group-hover:text-brand-400 transition-colors" />
                          )}
                        </div>
                      </div>
                      {!n.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead(n.id);
                          }}
                          className="p-1 rounded-md text-text-dim hover:text-text-primary hover:bg-overlay-5 transition flex-shrink-0"
                          title="Mark as read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
