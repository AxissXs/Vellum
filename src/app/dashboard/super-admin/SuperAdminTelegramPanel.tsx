"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Send, Settings, Users, Bot } from "lucide-react";

function maskToken(token: string | null): string {
  if (!token) return "";
  if (token.length <= 8) return "********";
  return token.slice(0, 4) + "..." + token.slice(-4);
}

export default function SuperAdminTelegramPanel() {
  const queryClient = useQueryClient();
  const [tokenInput, setTokenInput] = useState("");
  const [supergroupInput, setSupergroupInput] = useState("");
  const [channelInput, setChannelInput] = useState("");

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["super-admin", "telegram", "settings"],
    queryFn: async () => {
      const res = await api.get<{
        settings: Record<string, string | null>;
      }>("/api/super-admin/telegram/settings");
      return res.settings;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["super-admin", "telegram", "stats"],
    queryFn: async () => {
      const res = await api.get<{ pairedUsers: number }>(
        "/api/super-admin/telegram/stats"
      );
      return res;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (body: Record<string, string | null>) => {
      const res = await api.patch<{ settings: Record<string, string | null> }>(
        "/api/super-admin/telegram/settings",
        body
      );
      return res.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "telegram", "settings"],
      });
      toast.success("Settings updated");
      setTokenInput("");
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ ok: boolean; username?: string; firstName?: string }>(
        "/api/super-admin/telegram/test"
      );
      return res;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`Connected to @${data.username}`);
      } else {
        toast.error(data.username || "Connection failed");
      }
    },
    onError: () => {
      toast.error("Connection test failed");
    },
  });

  function handleSave() {
    const body: Record<string, string | null> = {};
    if (tokenInput.trim()) body.telegram_bot_token = tokenInput.trim();
    if (supergroupInput.trim()) body.telegram_supergroup_id = supergroupInput.trim() || null;
    if (channelInput.trim()) body.telegram_channel_id = channelInput.trim() || null;
    updateSettings.mutate(body);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Bot size={24} className="text-brand-600" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Telegram Bot</h2>
          <p className="text-sm text-slate-500">
            Configure the platform Telegram bot and view pairing stats.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-brand-500/10 border border-brand-500/20 p-3 rounded-lg">
            <Users size={20} className="text-brand-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {statsLoading ? "-" : stats?.pairedUsers ?? 0}
            </p>
            <p className="text-sm text-slate-500">Paired Users</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
          <div
            className={
              settings?.telegram_bot_token
                ? "bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg"
                : "bg-slate-100 border border-slate-200 p-3 rounded-lg"
            }
          >
            <Bot
              size={20}
              className={
                settings?.telegram_bot_token ? "text-emerald-600" : "text-slate-500"
              }
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {settings?.telegram_bot_token ? "Configured" : "Not Configured"}
            </p>
            <p className="text-sm text-slate-500">Bot Token</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings size={18} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Configuration
          </h3>
        </div>

        {settingsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-slate-500" size={24} />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Bot Token
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={
                    settings?.telegram_bot_token
                      ? maskToken(settings.telegram_bot_token)
                      : "Enter your Telegram bot token"
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Get this from @BotFather on Telegram.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Supergroup ID
                </label>
                <input
                  type="text"
                  value={supergroupInput}
                  onChange={(e) => setSupergroupInput(e.target.value)}
                  placeholder={
                    settings?.telegram_supergroup_id ?? "-123456789"
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Numeric ID of the supergroup for typed notifications.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Channel ID
                </label>
                <input
                  type="text"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  placeholder={
                    settings?.telegram_channel_id ?? "-1001234567890"
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Numeric ID of the channel for broadcast notifications.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={updateSettings.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
              >
                {updateSettings.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Save Settings
              </button>

              <button
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 transition"
              >
                {testConnection.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Test Connection
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
