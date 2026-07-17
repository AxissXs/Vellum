"use client";

import { useState } from "react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "@/hooks/useNotificationPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTelegramStatus, useGeneratePairingCode, useUnlinkTelegram } from "@/hooks/useTelegram";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import { Switch } from "@/components/ui/Switch";
import { Loader2, Link as LinkIcon, Unlink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const eventLabels: Record<string, string> = {
  task_assigned: "Task Assigned",
  task_mentioned: "Task Mentioned",
  due_date_approaching: "Due Date Approaching",
  status_changed: "Status Changed",
  new_comment: "New Comment",
  comment_mention: "Comment Mention",
  schedule_assigned: "Schedule Assigned",
};

export default function SettingsPage() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const { mutate: updatePref, isPending } = useUpdateNotificationPreference();
  const { isSupported, isSubscribed } = usePushNotifications();

  const { data: telegramStatus, isLoading: telegramLoading } = useTelegramStatus();
  const { mutate: generateCode, data: codeData, isPending: generatingCode } = useGeneratePairingCode();
  const { mutate: unlink, isPending: unlinking } = useUnlinkTelegram();

  const [copied, setCopied] = useState(false);

  function handleToggle(
    eventType: string,
    channel: "pushEnabled" | "inAppEnabled" | "emailEnabled" | "telegramEnabled"
  ) {
    const pref = preferences?.find((p) => p.eventType === eventType);
    if (!pref) return;

    updatePref({
      eventType,
      [channel]: !pref[channel],
    });
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(`/start ${code}`);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your notification preferences and account settings.
        </p>
      </div>

      {/* Push Notifications Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Push Notifications
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Get notified even when Perfect is closed.
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

      {/* Telegram Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <LinkIcon size={20} className="text-brand-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Telegram</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Receive notifications directly in Telegram.
            </p>
          </div>
        </div>

        {telegramLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-slate-500" size={24} />
          </div>
        ) : telegramStatus?.linked ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <p className="text-sm text-emerald-600">
                Linked to Telegram{" "}
                {telegramStatus.telegramUsername
                  ? `@${telegramStatus.telegramUsername}`
                  : "account"}
                .
              </p>
            </div>
            <button
              onClick={() => unlink()}
              disabled={unlinking}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50 transition"
            >
              {unlinking ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Unlink size={16} />
              )}
              Unlink Telegram
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Generate a pairing code and send it to the Perfect bot on Telegram.
            </p>

            {codeData?.code ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4">
                <code className="text-sm font-mono text-brand-600">
                  /start {codeData.code}
                </code>
                <button
                  onClick={() => copyCode(codeData.code)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                  title="Copy"
                >
                  {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => generateCode()}
                disabled={generatingCode}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
              >
                {generatingCode && <Loader2 size={16} className="animate-spin" />}
                Generate Pairing Code
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Notification Preferences
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Choose which events you want to be notified about and through which
          channels.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-slate-500" size={24} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 text-sm font-medium text-slate-500 pb-2 border-b border-slate-200">
              <div>Event</div>
              <div className="text-center">Push</div>
              <div className="text-center">In-App</div>
              <div className="text-center">Email</div>
              <div className="text-center">Telegram</div>
            </div>

            {preferences?.map((pref) => (
              <div
                key={pref.eventType}
                className="grid grid-cols-5 gap-4 items-center py-3 hover:bg-brand-50 rounded-lg px-2 transition"
              >
                <div className="text-sm text-slate-900">
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
                <div className="flex justify-center">
                  <Switch
                    checked={pref.telegramEnabled}
                    onCheckedChange={() =>
                      handleToggle(pref.eventType, "telegramEnabled")
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
