"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Send, Settings, Users, Bot, Link, Check, Copy, MessageSquare } from "lucide-react";

const eventLabels: Record<string, string> = {
  task_assigned: "Task Assigned",
  task_mentioned: "Task Mentioned",
  due_date_approaching: "Due Date Approaching",
  status_changed: "Status Changed",
  new_comment: "New Comment",
  comment_mention: "Comment Mention",
};

const eventTypes = Object.keys(eventLabels);

function maskToken(token: string | null): string {
  if (!token) return "";
  if (token.length <= 8) return "********";
  return token.slice(0, 4) + "..." + token.slice(-4);
}

type SettingsPayload = {
  settings: Record<string, string | null>;
  topics: Record<string, string | null>;
  channelEvents: string[];
  templates: Record<string, string | null>;
  webhookUrl: string | null;
};

function TelegramConfigForm({
  initialData,
  onSave,
  isSaving,
  onTest,
  isTesting,
}: {
  initialData: SettingsPayload;
  onSave: (body: Record<string, unknown>) => void;
  isSaving: boolean;
  onTest: (tokenOverride?: string) => void;
  isTesting: boolean;
}) {
  const [tokenInput, setTokenInput] = useState("");
  const [supergroupInput, setSupergroupInput] = useState(
    initialData.settings.telegram_supergroup_id ?? ""
  );
  const [channelInput, setChannelInput] = useState(
    initialData.settings.telegram_channel_id ?? ""
  );
  const [topics, setTopics] = useState<Record<string, string>>(() => {
    const t: Record<string, string> = {};
    for (const ev of eventTypes) t[ev] = initialData.topics[ev] ?? "";
    return t;
  });
  const [channelEvents, setChannelEvents] = useState<Record<string, boolean>>(() => {
    const ce: Record<string, boolean> = {};
    for (const ev of eventTypes) ce[ev] = initialData.channelEvents.includes(ev);
    return ce;
  });
  const [templates, setTemplates] = useState<Record<string, string>>(() => {
    const tmpl: Record<string, string> = {};
    for (const ev of eventTypes) tmpl[ev] = initialData.templates[ev] ?? "";
    return tmpl;
  });
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  function handleSave() {
    const body: Record<string, unknown> = {};
    if (tokenInput.trim()) body.telegram_bot_token = tokenInput.trim();
    body.telegram_supergroup_id = supergroupInput.trim() || null;
    body.telegram_channel_id = channelInput.trim() || null;
    body.topics = topics;
    body.channelEvents = Object.keys(channelEvents).filter((k) => channelEvents[k]);
    body.templates = templates;
    onSave(body);
  }

  function copyWebhook(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    toast.success("Webhook URL copied");
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  return (
    <div className="space-y-10">
      {/* Configuration */}
      <div className="bg-slate-800/50 border border-white/5 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
            Configuration
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Bot Token
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={
                initialData.settings.telegram_bot_token
                  ? maskToken(initialData.settings.telegram_bot_token)
                  : "Enter your Telegram bot token"
              }
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
            <p className="text-xs text-slate-500 mt-1">
              Get this from @BotFather on Telegram.
            </p>
          </div>

          {initialData.webhookUrl && (
            <div className="bg-slate-900 border border-white/10 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 mb-0.5">Webhook URL</p>
                <p className="text-sm text-sky-400 truncate font-mono">{initialData.webhookUrl}</p>
              </div>
              <button
                onClick={() => copyWebhook(initialData.webhookUrl!)}
                className="shrink-0 text-slate-400 hover:text-white transition"
                title="Copy webhook URL"
              >
                {copiedWebhook ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Supergroup ID <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={supergroupInput}
              onChange={(e) => setSupergroupInput(e.target.value)}
              placeholder="-123456789"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Channel ID <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              placeholder="-1001234567890"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            Save Settings
          </button>

          <button
            onClick={() => onTest(tokenInput.trim() || undefined)}
            disabled={isTesting}
            className="bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            {isTesting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Test Connection
          </button>
        </div>
      </div>

      {/* Topic Mappings */}
      <div className="bg-slate-800/50 border border-white/5 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
            Supergroup Topic Mapping
          </h3>
        </div>
        <p className="text-sm text-slate-400">
          Map each notification category to a forum topic ID in the supergroup. Leave blank to send to the general chat.
        </p>
        <div className="space-y-3">
          {eventTypes.map((ev) => (
            <div key={ev} className="grid grid-cols-2 gap-4 items-center">
              <div className="text-sm text-white">{eventLabels[ev]}</div>
              <input
                type="text"
                value={topics[ev] ?? ""}
                onChange={(e) =>
                  setTopics((prev) => ({ ...prev, [ev]: e.target.value }))
                }
                placeholder="Topic ID (optional)"
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Channel Events */}
      <div className="bg-slate-800/50 border border-white/5 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Link size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
            Channel Broadcast Events
          </h3>
        </div>
        <p className="text-sm text-slate-400">
          Select which notification types should also be broadcast to the configured channel.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {eventTypes.map((ev) => (
            <label
              key={ev}
              className="flex items-center gap-2 bg-slate-900/50 border border-white/5 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/[0.02] transition"
            >
              <input
                type="checkbox"
                checked={!!channelEvents[ev]}
                onChange={(e) =>
                  setChannelEvents((prev) => ({
                    ...prev,
                    [ev]: e.target.checked,
                  }))
                }
                className="rounded border-white/10 bg-slate-800 text-brand-500 focus:ring-brand-500/50"
              />
              <span className="text-sm text-white">{eventLabels[ev]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Message Templates */}
      <div className="bg-slate-800/50 border border-white/5 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
            Message Templates
          </h3>
        </div>
        <p className="text-sm text-slate-400">
          Customize the HTML message sent for each event type. Variables: {"`{title}`"}, {"`{content}`"}, {"`{url}`"}. Leave blank to use defaults.
        </p>
        <div className="space-y-4">
          {eventTypes.map((ev) => (
            <div key={ev}>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {eventLabels[ev]}
              </label>
              <textarea
                value={templates[ev] ?? ""}
                onChange={(e) =>
                  setTemplates((prev) => ({ ...prev, [ev]: e.target.value }))
                }
                placeholder={`<b>{title}</b>\n\n{content}\n\n<a href="{url}">Open in Vellum</a>`}
                rows={3}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 font-mono"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          Save All Settings
        </button>
      </div>
    </div>
  );
}

export default function SuperAdminTelegramPanel() {
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["super-admin", "telegram", "settings"],
    queryFn: async () => {
      const res = await api.get<SettingsPayload>("/api/super-admin/telegram/settings");
      return res;
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
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.patch<{
        settings: Record<string, string | null>;
        webhookSet?: boolean;
        error?: string;
      }>("/api/super-admin/telegram/settings", body);
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "telegram", "settings"],
      });
      toast.success(data.error ? "Saved with warning" : "Settings updated");
      if (data.error) toast.warning(data.error);
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  const testConnection = useMutation({
    mutationFn: async (tokenOverride?: string) => {
      const res = await api.post<{
        ok: boolean;
        username?: string;
        firstName?: string;
        error?: string;
      }>("/api/super-admin/telegram/test", { token: tokenOverride || null });
      return res;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`Connected to @${data.username}`);
      } else {
        toast.error(data.error || "Connection failed");
      }
    },
    onError: () => {
      toast.error("Connection test failed");
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bot size={24} className="text-brand-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Telegram Bot</h2>
          <p className="text-sm text-slate-400">
            Configure the platform Telegram bot, topic mappings, channel events, and message templates.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-brand-500/10 p-3 rounded-lg">
            <Users size={20} className="text-brand-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {statsLoading ? "-" : stats?.pairedUsers ?? 0}
            </p>
            <p className="text-sm text-slate-400">Paired Users</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-lg">
            <Bot size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {settingsData?.settings.telegram_bot_token ? "Configured" : "Not Configured"}
            </p>
            <p className="text-sm text-slate-400">Bot Token</p>
          </div>
        </div>
      </div>

      {settingsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : settingsData ? (
        <TelegramConfigForm
          key={settingsData.settings.telegram_bot_token ?? "empty"}
          initialData={settingsData}
          onSave={(body) => updateSettings.mutate(body)}
          isSaving={updateSettings.isPending}
          onTest={(token) => testConnection.mutate(token)}
          isTesting={testConnection.isPending}
        />
      ) : null}
    </div>
  );
}
