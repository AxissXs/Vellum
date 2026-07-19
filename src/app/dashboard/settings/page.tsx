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
import { Loader2, Link as LinkIcon, Unlink, Copy, Check, BookOpen, Monitor, Smartphone, Globe, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMySessions, useRevokeSession, useRevokeAllOtherSessions, parseUserAgent } from "@/hooks/useSessions";
import { clsx } from "clsx";

const eventLabels: Record<string, string> = {
  task_assigned: "Task Assigned",
  task_mentioned: "Task Mentioned",
  due_date_approaching: "Due Date Approaching",
  status_changed: "Status Changed",
  new_comment: "New Comment",
  comment_mention: "Comment Mention",
  schedule_assigned: "Schedule Assigned",
};

function TelegramUserGuide({
  linked,
  botUsername,
  configured,
}: {
  linked: boolean;
  botUsername: string | null;
  configured: boolean;
}) {
  const botLabel = botUsername ? `@${botUsername}` : "the Perfect bot";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
        <BookOpen size={13} className="text-brand-600" />
        How to link Telegram
      </p>
      {!configured && (
        <p className="text-xs text-amber-700">
          Bot is not configured yet. Ask a super admin (Super Admin → Telegram).
        </p>
      )}
      {linked ? (
        <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1">
          <li>Keep this account linked so Perfect can DM you.</li>
          <li>
            Below, turn on the{" "}
            <span className="font-medium text-slate-800">Telegram</span> column
            for events you want (defaults are off).
          </li>
          <li>
            Mentions: another user must @you in a comment (self-mentions are
            ignored). Enable{" "}
            <span className="font-medium text-slate-800">Comment Mention</span>.
          </li>
          <li>Unlink anytime if you no longer want bot DMs.</li>
          <li>
            Send <code className="font-mono text-[11px] bg-white border border-slate-200 px-1 rounded">/help</code>{" "}
            in {botLabel}, or type naturally (e.g. lunch tomorrow 1pm). The bot asks if
            details are missing. Use phone keyboard dictation — Telegram voice notes are
            not supported.
          </li>
        </ol>
      ) : (
        <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1">
          <li>
            Confirm a super admin configured the bot and webhook (Super Admin →
            Telegram).
          </li>
          <li>
            Click{" "}
            <span className="font-medium text-slate-800">Generate Pairing Code</span>{" "}
            (valid 10 minutes).
          </li>
          <li>
            Open {botLabel} in Telegram and send{" "}
            <code className="font-mono text-[11px] bg-white border border-slate-200 px-1 rounded">
              /start ABC123
            </code>
            .
          </li>
          <li>
            Enable{" "}
            <span className="font-medium text-slate-800">Telegram</span> under
            Notification Preferences for each event.
          </li>
        </ol>
      )}
      <p className="text-[11px] text-slate-500">
        Your toggles control private bot DMs only. Team group/channel posts are
        configured by super admins separately.
      </p>
    </div>
  );
}

function formatTimeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SessionsSection() {
  const { data: sessions, isLoading } = useMySessions();
  const { mutate: revokeSession, isPending: revoking } = useRevokeSession();
  const { mutate: revokeAll, isPending: revokingAll } = useRevokeAllOtherSessions();

  const otherSessions = sessions?.filter((s) => !s.isCurrent) ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Active Sessions</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your active login sessions across devices.
          </p>
        </div>
        {otherSessions.length > 0 && (
          <button
            onClick={() => revokeAll()}
            disabled={revokingAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
          >
            {revokingAll ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            Revoke all other sessions
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No active sessions.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const ua = parseUserAgent(s.userAgent);
            return (
              <div
                key={s.id}
                className={clsx(
                  "flex items-center justify-between rounded-lg border px-4 py-3",
                  s.isCurrent
                    ? "border-brand-500/30 bg-brand-50"
                    : "border-slate-200 bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  {ua.os.includes("Android") || ua.os === "iOS" ? (
                    <Smartphone size={18} className="text-slate-500" />
                  ) : (
                    <Monitor size={18} className="text-slate-500" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {ua.browser} on {ua.os}
                      </span>
                      {s.isCurrent && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 border border-brand-500/20 font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      {s.ipAddress && (
                        <span className="flex items-center gap-1">
                          <Globe size={10} />
                          {s.ipAddress}
                        </span>
                      )}
                      <span>Created {formatTimeAgo(s.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {!s.isCurrent && (
                  <button
                    onClick={() => revokeSession(s.id)}
                    disabled={revoking}
                    className="text-slate-400 hover:text-red-600 transition p-1.5 rounded-lg hover:bg-red-50"
                    title="Revoke session"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const { mutate: updatePref, isPending } = useUpdateNotificationPreference();
  const { isSupported, isSubscribed } = usePushNotifications();

  const { data: telegramStatus, isLoading: telegramLoading } = useTelegramStatus();
  const { mutate: generateCode, data: codeData, isPending: generatingCode } = useGeneratePairingCode();
  const { mutate: unlink, isPending: unlinking } = useUnlinkTelegram();

  const { data: telegramConfig } = useQuery({
    queryKey: ["telegram", "config"],
    queryFn: async () =>
      api.get<{ configured: boolean; username: string | null }>(
        "/api/telegram/config"
      ),
  });

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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-amber-800">
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
            <TelegramUserGuide
              linked
              configured={telegramConfig?.configured ?? false}
              botUsername={telegramConfig?.username ?? null}
            />
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
            <TelegramUserGuide
              linked={false}
              configured={telegramConfig?.configured ?? false}
              botUsername={telegramConfig?.username ?? null}
            />

            {codeData?.code ? (
              <div className="space-y-2">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4">
                  <code className="text-sm font-mono text-brand-600">
                    /start {codeData.code}
                  </code>
                  <button
                    onClick={() => copyCode(codeData.code)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                    title="Copy"
                  >
                    {copied ? (
                      <Check size={18} className="text-emerald-600" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Paste this into a DM with the bot. Code expires in 10 minutes —
                  generate a new one if it fails.
                </p>
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

      {/* Active Sessions */}
      <SessionsSection />

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
