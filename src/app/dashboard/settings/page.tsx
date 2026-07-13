"use client";

import { useState } from "react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "@/hooks/useNotificationPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import { Switch } from "@/components/ui/Switch";
import { Loader2 } from "lucide-react";

const eventLabels: Record<string, string> = {
  task_assigned: "Task Assigned",
  task_mentioned: "Task Mentioned",
  due_date_approaching: "Due Date Approaching",
  status_changed: "Status Changed",
  new_comment: "New Comment",
  comment_mention: "Comment Mention",
};

export default function SettingsPage() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const { mutate: updatePref, isPending } = useUpdateNotificationPreference();
  const { isSupported, isSubscribed } = usePushNotifications();

  function handleToggle(
    eventType: string,
    channel: "pushEnabled" | "inAppEnabled" | "emailEnabled"
  ) {
    const pref = preferences?.find((p) => p.eventType === eventType);
    if (!pref) return;

    updatePref({
      eventType,
      [channel]: !pref[channel],
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage your notification preferences and account settings.
        </p>
      </div>

      {/* Push Notifications Section */}
      <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Push Notifications
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Get notified even when Vellum is closed.
            </p>
          </div>
          <PushNotificationToggle />
        </div>

        {isSupported && !isSubscribed && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-4">
            <p className="text-sm text-amber-400">
              Push notifications are currently disabled. Enable them above to
              receive real-time updates.
            </p>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Notification Preferences
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Choose which events you want to be notified about and through which
          channels.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-slate-400 pb-2 border-b border-white/5">
              <div>Event</div>
              <div className="text-center">Push</div>
              <div className="text-center">In-App</div>
              <div className="text-center">Email</div>
            </div>

            {preferences?.map((pref) => (
              <div
                key={pref.eventType}
                className="grid grid-cols-4 gap-4 items-center py-3 hover:bg-white/[0.02] rounded-lg px-2 transition"
              >
                <div className="text-sm text-white">
                  {eventLabels[pref.eventType] || pref.eventType}
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.pushEnabled}
                    onCheckedChange={() =>
                      handleToggle(pref.eventType, "pushEnabled")
                    }
                    disabled={isPending || !isSubscribed}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.inAppEnabled}
                    onCheckedChange={() =>
                      handleToggle(pref.eventType, "inAppEnabled")
                    }
                    disabled={isPending}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.emailEnabled}
                    onCheckedChange={() =>
                      handleToggle(pref.eventType, "emailEnabled")
                    }
                    disabled={isPending}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
