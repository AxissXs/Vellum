"use client";

import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellRing, X } from "lucide-react";
import { clsx } from "clsx";

export default function PushNotificationToggle() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();
  const [showModal, setShowModal] = useState(false);

  if (!isSupported) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowModal(!showModal)}
        className={clsx(
          "p-2 rounded-lg transition flex items-center justify-center",
          isSubscribed
            ? "text-green-400 hover:bg-green-500/10"
            : "text-slate-500 hover:text-slate-200 hover:bg-slate-50"
        )}
        title="Push notifications"
      >
        {isSubscribed ? <BellRing size={18} /> : <Bell size={18} />}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-sm mx-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Push Notifications
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-6">
              {isSubscribed
                ? "You are receiving push notifications. Disable them below."
                : "Enable push notifications to get real-time updates even when Vellum is closed."}
            </p>

            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={isLoading}
              className={clsx(
                "w-full py-2.5 rounded-lg text-sm font-medium transition",
                isSubscribed
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "bg-brand-500 text-slate-900 hover:bg-brand-600",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoading
                ? "Loading..."
                : isSubscribed
                ? "Disable Push Notifications"
                : "Enable Push Notifications"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
