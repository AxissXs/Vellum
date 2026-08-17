"use client";

import { useState } from "react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "@/hooks/useNotificationPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTelegramStatus, useGeneratePairingCode, useUnlinkTelegram } from "@/hooks/useTelegram";
import { useMySessions, useRevokeSession, useRevokeAllOtherSessions, parseUserAgent } from "@/hooks/useSessions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import { Switch } from "@/components/ui/Switch";
import { Loader2, Link as LinkIcon, Unlink, Copy, Check, Monitor, Smartphone, LogOut, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const eventLabels: Record<string, string> = {
  task_assigned: "Task Assigned",
  task_mentioned: "Task Mentioned",
  due_date_approaching: "Due Date Approaching",
  status_changed: "Status Changed",
  new_comment: "New Comment",
  comment_mention: "Comment Mention",
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const { mutate: updatePref, isPending } = useUpdateNotificationPreference();
  const { isSupported, isSubscribed } = usePushNotifications();

  const { data: telegramConfig } = useQuery({
    queryKey: ["telegram-config"],
    queryFn: async () => {
      const res = await api.get<{ configured: boolean; username: string | null }>(
        "/api/telegram/config"
      );
      return res;
    },
  });

  const { data: telegramStatus, isLoading: telegramLoading } = useTelegramStatus();
  const { mutate: generateCode, data: codeData, isPending: generatingCode } = useGeneratePairingCode();
  const { mutate: unlink, isPending: unlinking } = useUnlinkTelegram();

  const [copied, setCopied] = useState(false);

  const { data: sessions, isLoading: sessionsLoading } = useMySessions();
  const { mutate: revokeSession, isPending: revoking } = useRevokeSession();
  const { mutate: revokeAll, isPending: revokingAll } = useRevokeAllOtherSessions();

  const botConfigured = !!telegramConfig?.configured;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      return api.post<{ success: true }>("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to change password");
    },
  });

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

  const gridCols = botConfigured ? "grid-cols-5" : "grid-cols-4";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-dim mt-1">
          Manage your notification preferences and account settings.
        </p>
      </div>

      {/* Push Notifications Section */}
      <div className="bg-surface-card/50 border border-border-subtle rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Push Notifications
            </h2>
            <p className="text-sm text-text-dim mt-1">
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

      {/* Telegram Section — only when bot is configured */}
      {botConfigured && (
        <div className="bg-surface-card/50 border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <LinkIcon size={20} className="text-sky-400" />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Telegram</h2>
              <p className="text-sm text-text-dim mt-0.5">
                Receive notifications directly in Telegram.
              </p>
            </div>
          </div>

          {telegramLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-text-dim" size={24} />
            </div>
          ) : telegramStatus?.linked ? (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <p className="text-sm text-emerald-400">
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
                className="bg-overlay-5 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 text-text-muted text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
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
              <p className="text-sm text-text-dim">
                Generate a pairing code and send it to the Vellum bot on Telegram.
              </p>

              {codeData?.code ? (
                <div className="bg-surface-strong/50 border border-border-subtle rounded-lg p-4 flex items-center justify-between gap-4">
                  <code className="text-sm font-mono text-sky-400">
                    /start {codeData.code}
                  </code>
                  <button
                    onClick={() => copyCode(codeData.code)}
                    className="text-text-dim hover:text-text-primary transition"
                    title="Copy"
                  >
                    {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => generateCode()}
                  disabled={generatingCode}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-text-primary text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
                >
                  {generatingCode && <Loader2 size={16} className="animate-spin" />}
                  Generate Pairing Code
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Change Password Section */}
      <div className="bg-surface-card/50 border border-border-subtle rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <KeyRound size={20} className="text-text-dim" />
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Change Password</h2>
            <p className="text-sm text-text-dim mt-0.5">
              Update your account password.
            </p>
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-surface-page px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-surface-page px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-surface-page px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
              placeholder="••••••••"
            />
          </div>
          <button
            onClick={() => {
              if (!currentPassword || !newPassword) {
                toast.error("Please fill in all fields");
                return;
              }
              if (newPassword.length < 8) {
                toast.error("New password must be at least 8 characters");
                return;
              }
              if (newPassword !== confirmPassword) {
                toast.error("Passwords do not match");
                return;
              }
              changePasswordMutation.mutate();
            }}
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-text-primary text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            {changePasswordMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            Change Password
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-surface-card/50 border border-border-subtle rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Notification Preferences
        </h2>
        <p className="text-sm text-text-dim mb-6">
          Choose which events you want to be notified about and through which
          channels.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-text-dim" size={24} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`grid ${gridCols} gap-4 text-sm font-medium text-text-dim pb-2 border-b border-border-subtle`}>
              <div>Event</div>
              <div className="text-center">Push</div>
              <div className="text-center">In-App</div>
              <div className="text-center">Email</div>
              {botConfigured && <div className="text-center">Telegram</div>}
            </div>

            {preferences?.map((pref) => (
              <div
                key={pref.eventType}
                className={`grid ${gridCols} gap-4 items-center py-3 hover:bg-overlay-5 rounded-lg px-2 transition`}
              >
                <div className="text-sm text-text-primary">
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
                {botConfigured && (
                  <div className="flex justify-center">
                    <Switch
                      checked={pref.telegramEnabled}
                      onCheckedChange={() =>
                        handleToggle(pref.eventType, "telegramEnabled")
                      }
                      disabled={isPending}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-surface-card/50 border border-border-subtle rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Active Sessions</h2>
            <p className="text-sm text-text-dim mt-1">
              Manage devices where you are currently logged in.
            </p>
          </div>
          {(sessions?.length ?? 0) > 1 && (
            <button
              onClick={() => revokeAll()}
              disabled={revokingAll}
              className="bg-overlay-5 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 text-text-muted text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              {revokingAll ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
              Revoke All Others
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-text-dim" size={24} />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => {
              const { browser, os } = parseUserAgent(session.userAgent);
              const isMobile = /Android|iPhone|iPad/i.test(session.userAgent || "");
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between bg-surface-strong/50 border border-border-subtle rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {isMobile ? (
                      <Smartphone size={18} className="text-text-dim flex-shrink-0" />
                    ) : (
                      <Monitor size={18} className="text-text-dim flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary font-medium">
                          {browser} on {os}
                        </span>
                        {session.isCurrent && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-dim mt-0.5">
                        {session.ipAddress && <span>{session.ipAddress}</span>}
                        {session.ipAddress && <span>·</span>}
                        <span>Active {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => revokeSession(session.id)}
                      disabled={revoking}
                      className="text-text-dim hover:text-red-400 hover:bg-red-500/10 text-xs font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-dim">No active sessions found.</p>
        )}
      </div>
    </div>
  );
}
