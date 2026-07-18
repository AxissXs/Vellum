"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Settings,
  Users,
  Bot,
  Link,
  Check,
  Copy,
  MessageSquare,
  Plus,
  Unplug,
  QrCode,
} from "lucide-react";

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

function TopicCreator({
  existingId,
  onCreated,
}: {
  existingId: string;
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [iconColor, setIconColor] = useState("");

  const createTopic = useMutation({
    mutationFn: async (body: { name: string; iconColor?: number }) => {
      const res = await api.post<{
        ok: boolean;
        topic?: { messageThreadId: number; name: string };
        error?: string;
      }>("/api/super-admin/telegram/topics", body);
      return res;
    },
    onSuccess: (data) => {
      if (data.ok && data.topic) {
        toast.success(`Created topic "${data.topic.name}"`);
        onCreated(String(data.topic.messageThreadId));
        setOpen(false);
        setTopicName("");
      } else {
        toast.error(data.error || "Failed to create topic");
      }
    },
    onError: () => {
      toast.error("Failed to create topic");
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate-400 hover:text-brand-400 transition flex items-center gap-1"
      >
        <Plus size={12} />
        Create topic
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 bg-slate-900 border border-white/10 rounded-lg p-3">
      <input
        type="text"
        value={topicName}
        onChange={(e) => setTopicName(e.target.value)}
        placeholder="Topic name"
        className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            createTopic.mutate({
              name: topicName,
              iconColor: iconColor ? Number(iconColor) : undefined,
            })
          }
          disabled={createTopic.isPending || !topicName.trim()}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition flex items-center gap-1"
        >
          {createTopic.isPending && (
            <Loader2 size={12} className="animate-spin" />
          )}
          Create
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:text-white transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function TopicBinder({ eventType }: { eventType: string }) {
  const [code, setCode] = useState<string | null>(null);

  const generateCode = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ code: string; eventType: string }>(
        "/api/telegram/topic-code",
        { eventType },
      );
      return res;
    },
    onSuccess: (data) => {
      setCode(data.code);
    },
    onError: () => {
      toast.error("Failed to generate binding code");
    },
  });

  if (code) {
    return (
      <div className="mt-2 bg-slate-900 border border-white/10 rounded-lg p-3 space-y-1.5">
        <p className="text-xs text-slate-400">
          Send this command inside the target forum topic:
        </p>
        <div className="flex items-center gap-2">
          <code className="text-sm text-emerald-400 font-mono bg-slate-800 px-2 py-1 rounded">
            /bindtopic {code}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`/bindtopic ${code}`);
              toast.success("Copied");
            }}
            className="text-slate-400 hover:text-white transition"
          >
            <Copy size={14} />
          </button>
        </div>
        <p className="text-xs text-slate-500">Expires in 10 minutes</p>
        <button
          onClick={() => setCode(null)}
          className="text-xs text-slate-400 hover:text-white transition"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => generateCode.mutate()}
      disabled={generateCode.isPending}
      className="text-xs text-slate-400 hover:text-sky-400 transition flex items-center gap-1"
    >
      {generateCode.isPending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Unplug size={12} />
      )}
      Bind existing topic
    </button>
  );
}

function SupergroupPairer({ onPaired }: { onPaired: (id: string) => void }) {
  const [code, setCode] = useState<string | null>(null);

  const generateCode = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ code: string }>(
        "/api/telegram/supergroup-code",
      );
      return res;
    },
    onSuccess: (data) => {
      setCode(data.code);
    },
    onError: () => {
      toast.error("Failed to generate pairing code");
    },
  });

  if (code) {
    return (
      <div className="mt-2 bg-slate-900 border border-white/10 rounded-lg p-3 space-y-1.5">
        <p className="text-xs text-slate-400">
          Add the bot to your supergroup as an admin, then send this command
          inside the group:
        </p>
        <div className="flex items-center gap-2">
          <code className="text-sm text-emerald-400 font-mono bg-slate-800 px-2 py-1 rounded">
            /pairgroup {code}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`/pairgroup ${code}`);
              toast.success("Copied");
            }}
            className="text-slate-400 hover:text-white transition"
          >
            <Copy size={14} />
          </button>
        </div>
        <p className="text-xs text-slate-500">Expires in 10 minutes</p>
        <button
          onClick={() => setCode(null)}
          className="text-xs text-slate-400 hover:text-white transition"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => generateCode.mutate()}
      disabled={generateCode.isPending}
      className="text-xs text-slate-400 hover:text-sky-400 transition flex items-center gap-1"
    >
      {generateCode.isPending && <Loader2 size={12} className="animate-spin" />}
      Pair supergroup
    </button>
  );
}

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
    initialData.settings.telegram_supergroup_id ?? "",
  );
  const [channelInput, setChannelInput] = useState(
    initialData.settings.telegram_channel_id ?? "",
  );
  const [topics, setTopics] = useState<Record<string, string>>(() => {
    const t: Record<string, string> = {};
    for (const ev of eventTypes) t[ev] = initialData.topics[ev] ?? "";
    return t;
  });
  const [channelEvents, setChannelEvents] = useState<Record<string, boolean>>(
    () => {
      const ce: Record<string, boolean> = {};
      for (const ev of eventTypes)
        ce[ev] = initialData.channelEvents.includes(ev);
      return ce;
    },
  );
  const [templates, setTemplates] = useState<Record<string, string>>(() => {
    const tmpl: Record<string, string> = {};
    for (const ev of eventTypes) tmpl[ev] = initialData.templates[ev] ?? "";
    return tmpl;
  });
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  function handleSaveConfig() {
    const body: Record<string, unknown> = {};
    if (tokenInput.trim()) body.telegram_bot_token = tokenInput.trim();
    body.telegram_supergroup_id = supergroupInput.trim() || null;
    body.telegram_channel_id = channelInput.trim() || null;
    onSave(body);
  }

  function handleSaveTopics() {
    onSave({ topics });
  }

  function handleSaveChannelEvents() {
    onSave({
      channelEvents: Object.keys(channelEvents).filter((k) => channelEvents[k]),
    });
  }

  function handleSaveTemplates() {
    onSave({ templates });
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
                <p className="text-sm text-sky-400 truncate font-mono">
                  {initialData.webhookUrl}
                </p>
              </div>
              <button
                onClick={() => copyWebhook(initialData.webhookUrl!)}
                className="shrink-0 text-slate-400 hover:text-white transition"
                title="Copy webhook URL"
              >
                {copiedWebhook ? (
                  <Check size={18} className="text-emerald-400" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Supergroup ID{" "}
              <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={supergroupInput}
              onChange={(e) => setSupergroupInput(e.target.value)}
              placeholder="-123456789"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
            <SupergroupPairer onPaired={(id) => setSupergroupInput(id)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Channel ID{" "}
              <span className="text-slate-500 font-normal">(optional)</span>
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
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            Save
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
          Map each notification category to a forum topic ID in the supergroup.
          Leave blank to send to the general chat. Use "Create topic" to create
          a new forum topic directly.
        </p>
        <div className="space-y-4">
          {eventTypes.map((ev) => (
            <div
              key={ev}
              className="bg-slate-900/30 border border-white/5 rounded-lg p-3 space-y-2"
            >
              <div className="text-sm text-white font-medium">
                {eventLabels[ev]}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={topics[ev] ?? ""}
                  onChange={(e) =>
                    setTopics((prev) => ({ ...prev, [ev]: e.target.value }))
                  }
                  placeholder="Topic ID (optional)"
                  className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
                <TopicCreator
                  existingId={topics[ev] ?? ""}
                  onCreated={(id) =>
                    setTopics((prev) => ({ ...prev, [ev]: id }))
                  }
                />
                <TopicBinder eventType={ev} />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveTopics}
          disabled={isSaving}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          Save
        </button>
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
          Select which notification types should also be broadcast to the
          configured channel.
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

        <button
          onClick={handleSaveChannelEvents}
          disabled={isSaving}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          Save
        </button>
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
          Customize the HTML message sent for each event type. Variables:{" "}
          {"`{title}`"}, {"`{content}`"}, {"`{url}`"}. Leave blank to use
          defaults.
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
          onClick={handleSaveTemplates}
          disabled={isSaving}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          Save
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
      const res = await api.get<SettingsPayload>(
        "/api/super-admin/telegram/settings",
      );
      return res;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["super-admin", "telegram", "stats"],
    queryFn: async () => {
      const res = await api.get<{ pairedUsers: number }>(
        "/api/super-admin/telegram/stats",
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
            Configure the platform Telegram bot, topic mappings, channel events,
            and message templates.
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
              {statsLoading ? "-" : (stats?.pairedUsers ?? 0)}
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
              {settingsData?.settings.telegram_bot_token
                ? "Configured"
                : "Not Configured"}
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
