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
  BookOpen,
  ChevronDown,
  Copy,
  Check,
  MessageSquare,
  Plus,
  Link as LinkIcon,
  Activity,
  RefreshCw,
} from "lucide-react";

const eventLabels: Record<string, string> = {
  task_assigned: "Task Assigned",
  task_mentioned: "Task Mentioned",
  due_date_approaching: "Due Date Approaching",
  status_changed: "Status Changed",
  new_comment: "New Comment",
  comment_mention: "Comment Mention",
  schedule_assigned: "Schedule Assigned",
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

function SetupGuide({ webhookUrl }: { webhookUrl: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-100/80 transition"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <BookOpen size={16} className="text-brand-600" />
          Setup guide
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Create a bot with @BotFather, open it, and tap{" "}
              <span className="font-medium text-slate-800">Start</span>.
            </li>
            <li>
              Paste the bot token below, optionally set group/channel IDs, then{" "}
              <span className="font-medium text-slate-800">Save Settings</span>.
              Webhook registers automatically when a token is saved
              {webhookUrl ? (
                <>
                  {" "}
                  (
                  <code className="text-xs font-mono bg-white border border-slate-200 px-1 rounded break-all">
                    {webhookUrl}
                  </code>
                  ).
                </>
              ) : (
                <>
                  {" "}
                  (set{" "}
                  <code className="text-xs font-mono">NEXT_PUBLIC_APP_URL</code>{" "}
                  or we use this page&apos;s origin).
                </>
              )}
            </li>
            <li>
              Map forum topics and channel events below if you want group/channel
              broadcasts (in addition to private DMs).
            </li>
            <li>
              Users pair in Settings → Telegram, then enable Telegram per event.
            </li>
          </ol>
          <p className="text-xs text-amber-800/90 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
            Personal notifications are DMs after pairing. Group/channel posts
            fire for every <code className="font-mono text-[11px]">sendNotification</code>{" "}
            when configured — not controlled by each user&apos;s Telegram toggle.
          </p>
        </div>
      )}
    </div>
  );
}

function TopicCreator({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [topicName, setTopicName] = useState("");

  const createTopic = useMutation({
    mutationFn: async (body: { name: string }) =>
      api.post<{
        ok: boolean;
        topic?: { messageThreadId: number; name: string };
        error?: string;
      }>("/api/super-admin/telegram/topics", body),
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
    onError: () => toast.error("Failed to create topic"),
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-slate-500 hover:text-brand-600 transition flex items-center gap-1 shrink-0"
      >
        <Plus size={12} />
        Create topic
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <input
        type="text"
        value={topicName}
        onChange={(e) => setTopicName(e.target.value)}
        placeholder="Topic name"
        className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
      />
      <button
        type="button"
        disabled={!topicName.trim() || createTopic.isPending}
        onClick={() => createTopic.mutate({ name: topicName.trim() })}
        className="text-xs font-medium text-brand-600 disabled:opacity-50"
      >
        {createTopic.isPending ? "…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-slate-400"
      >
        Cancel
      </button>
    </div>
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
  onTest: (token?: string) => void;
  isTesting: boolean;
}) {
  const [tokenInput, setTokenInput] = useState("");
  const [supergroupInput, setSupergroupInput] = useState(
    initialData.settings.telegram_supergroup_id ?? ""
  );
  const [channelInput, setChannelInput] = useState(
    initialData.settings.telegram_channel_id ?? ""
  );
  const [topics, setTopics] = useState<Record<string, string>>(
    Object.fromEntries(
      eventTypes.map((ev) => [ev, initialData.topics[ev] ?? ""])
    )
  );
  const [channelEvents, setChannelEvents] = useState<Record<string, boolean>>(
    Object.fromEntries(
      eventTypes.map((ev) => [
        ev,
        initialData.channelEvents.includes(ev),
      ])
    )
  );
  const [templates, setTemplates] = useState<Record<string, string>>(
    Object.fromEntries(
      eventTypes.map((ev) => [ev, initialData.templates[ev] ?? ""])
    )
  );
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const displayWebhook =
    initialData.webhookUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/api/telegram/webhook`
      : null);

  function handleSave() {
    const body: Record<string, unknown> = {
      webhookOrigin:
        typeof window !== "undefined" ? window.location.origin : undefined,
      setWebhook: true,
      topics,
      channelEvents: eventTypes.filter((ev) => channelEvents[ev]),
      templates,
    };
    if (tokenInput.trim()) body.telegram_bot_token = tokenInput.trim();
    body.telegram_supergroup_id = supergroupInput.trim() || null;
    body.telegram_channel_id = channelInput.trim() || null;
    onSave(body);
    setTokenInput("");
  }

  function copyWebhook(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    toast.success("Webhook URL copied");
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  return (
    <div className="space-y-6">
      <SetupGuide webhookUrl={displayWebhook} />

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Configuration
          </h3>
        </div>

        {displayWebhook && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 mb-0.5">Webhook URL</p>
              <p className="text-sm text-brand-600 truncate font-mono">
                {displayWebhook}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyWebhook(displayWebhook)}
              className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              title="Copy"
            >
              {copiedWebhook ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Bot Token
          </label>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder={
              initialData.settings.telegram_bot_token
                ? maskToken(initialData.settings.telegram_bot_token)
                : "Enter bot token from @BotFather"
            }
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Supergroup ID{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={supergroupInput}
            onChange={(e) => setSupergroupInput(e.target.value)}
            placeholder="-1001234567890"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Forum group for topic-routed activity posts. Bot must be an admin.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Channel ID{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            placeholder="-1001234567890"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Broadcasts only for events checked under Channel Broadcast Events.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            Save Settings
          </button>
          <button
            type="button"
            onClick={() => onTest(tokenInput.trim() || undefined)}
            disabled={isTesting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
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

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Supergroup topic mapping
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          Map each event to a forum topic ID. Leave blank to post in the general
          chat.
        </p>
        <div className="space-y-3">
          {eventTypes.map((ev) => (
            <div
              key={ev}
              className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 space-y-2"
            >
              <div className="text-sm font-medium text-slate-800">
                {eventLabels[ev]}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={topics[ev] ?? ""}
                  onChange={(e) =>
                    setTopics((prev) => ({ ...prev, [ev]: e.target.value }))
                  }
                  placeholder="Topic ID (optional)"
                  className="flex-1 min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <TopicCreator
                  onCreated={(id) =>
                    setTopics((prev) => ({ ...prev, [ev]: id }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <LinkIcon size={18} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Channel broadcast events
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          Which notification types also post to the channel.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {eventTypes.map((ev) => (
            <label
              key={ev}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer hover:bg-slate-100"
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
                className="rounded border-slate-300 text-brand-500 focus:ring-brand-500/40"
              />
              <span className="text-sm text-slate-800">{eventLabels[ev]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Message templates
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          HTML for DMs and channel posts. Variables:{" "}
          <code className="text-xs font-mono">{"{title}"}</code>,{" "}
          <code className="text-xs font-mono">{"{content}"}</code>,{" "}
          <code className="text-xs font-mono">{"{url}"}</code>. Blank = default.
        </p>
        <div className="space-y-4">
          {eventTypes.map((ev) => (
            <div key={ev}>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                {eventLabels[ev]}
              </label>
              <textarea
                value={templates[ev] ?? ""}
                onChange={(e) =>
                  setTemplates((prev) => ({ ...prev, [ev]: e.target.value }))
                }
                placeholder={
                  "<b>{title}</b>\n\n{content}\n\n<a href=\"{url}\">Open in Perfect</a>"
                }
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          Save all settings
        </button>
      </div>
    </div>
  );
}

type LlmHealthSnapshot = {
  ok: boolean;
  checkedAt: string;
  latencyMs: number | null;
  model: string;
  error: string | null;
  consecutiveFailures: number;
  source: string;
};

type LlmHealthPayload = {
  configured: boolean;
  model: string;
  thinkEnabled: boolean;
  health: LlmHealthSnapshot | null;
};

function LlmInterpretHealthCard() {
  const queryClient = useQueryClient();
  const queryKey = ["super-admin", "telegram", "llm-health"] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () =>
      api.get<LlmHealthPayload>("/api/super-admin/telegram/llm-health"),
  });

  const probe = useMutation({
    mutationFn: async () =>
      api.post<LlmHealthPayload>("/api/super-admin/telegram/llm-health", {}),
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKey, payload);
      if (payload.health?.ok) toast.success("LLM probe OK");
      else toast.warning(payload.health?.error || "LLM probe failed");
    },
    onError: () => toast.error("LLM probe failed"),
  });

  const setThink = useMutation({
    mutationFn: async (thinkEnabled: boolean) =>
      api.patch<LlmHealthPayload>("/api/super-admin/telegram/llm-health", {
        thinkEnabled,
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKey, payload);
      toast.success(
        payload.thinkEnabled ? "Model thinking enabled" : "Model thinking disabled"
      );
    },
    onError: () => toast.error("Failed to update thinking setting"),
  });

  const statusLabel = !data?.configured
    ? "Not configured"
    : !data.health
      ? "Unknown"
      : data.health.ok
        ? "Healthy"
        : "Down";

  const statusClass = !data?.configured
    ? "bg-slate-100 text-slate-600"
    : !data.health
      ? "bg-amber-50 text-amber-800"
      : data.health.ok
        ? "bg-emerald-50 text-emerald-800"
        : "bg-red-50 text-red-800";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/10 border border-brand-500/20 p-3 rounded-lg">
            <Activity size={20} className="text-brand-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Natural language (Ollama)
            </h3>
            <p className="text-xs text-slate-500">
              Health probe + thinking toggle. Does not restart the Mac host.
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusClass}`}
        >
          {isLoading ? "…" : statusLabel}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-slate-400" size={20} />
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Model</dt>
              <dd className="text-slate-900 font-medium">
                {data?.health?.model || data?.model || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Last check</dt>
              <dd className="text-slate-900">
                {data?.health?.checkedAt
                  ? new Date(data.health.checkedAt).toLocaleString()
                  : "Never"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Latency</dt>
              <dd className="text-slate-900">
                {data?.health?.latencyMs != null
                  ? `${data.health.latencyMs} ms`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Failures</dt>
              <dd className="text-slate-900">
                {data?.health?.consecutiveFailures ?? 0}
                {data?.health?.source ? ` (${data.health.source})` : ""}
              </dd>
            </div>
          </dl>
          {data?.health?.error ? (
            <p className="text-xs text-red-600 wrap-break-word">{data.health.error}</p>
          ) : null}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 rounded border-slate-300"
              checked={data?.thinkEnabled ?? true}
              disabled={setThink.isPending}
              onChange={(e) => setThink.mutate(e.target.checked)}
            />
            <span>
              <span className="text-sm font-medium text-slate-900">
                Enable model thinking
              </span>
              <span className="block text-xs text-slate-500">
                Faster when off; date/year accuracy may drop.
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => probe.mutate()}
            disabled={probe.isPending || !data?.configured}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {probe.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Probe now
          </button>
        </>
      )}
    </div>
  );
}

export default function SuperAdminTelegramPanel() {
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["super-admin", "telegram", "settings"],
    queryFn: async () =>
      api.get<SettingsPayload>("/api/super-admin/telegram/settings"),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["super-admin", "telegram", "stats"],
    queryFn: async () =>
      api.get<{ pairedUsers: number }>("/api/super-admin/telegram/stats"),
  });

  const updateSettings = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      api.patch<
        SettingsPayload & {
          webhookSet?: boolean | null;
          webhookError?: string | null;
        }
      >("/api/super-admin/telegram/settings", body),
    onSuccess: (data) => {
      queryClient.setQueryData(["super-admin", "telegram", "settings"], data);
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "telegram", "settings"],
      });
      if (data.webhookError) {
        toast.warning(`Saved, but webhook: ${data.webhookError}`);
      } else if (data.webhookSet) {
        toast.success("Settings saved and webhook registered");
      } else {
        toast.success("Settings updated");
      }
    },
    onError: () => toast.error("Failed to update settings"),
  });

  const testConnection = useMutation({
    mutationFn: async (tokenOverride?: string) =>
      api.post<{
        ok: boolean;
        username?: string;
        firstName?: string;
        error?: string;
      }>("/api/super-admin/telegram/test", {
        token: tokenOverride || null,
      }),
    onSuccess: (data) => {
      if (data.ok) toast.success(`Connected to @${data.username}`);
      else toast.error(data.error || "Connection failed");
    },
    onError: () => toast.error("Connection test failed"),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Bot size={24} className="text-brand-600" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Telegram Bot</h2>
          <p className="text-sm text-slate-500">
            Bot token, webhook, group topics, channel events, and templates.
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
              settingsData?.settings.telegram_bot_token
                ? "bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg"
                : "bg-slate-100 border border-slate-200 p-3 rounded-lg"
            }
          >
            <Bot
              size={20}
              className={
                settingsData?.settings.telegram_bot_token
                  ? "text-emerald-600"
                  : "text-slate-500"
              }
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {settingsData?.settings.telegram_bot_token
                ? "Configured"
                : "Not Configured"}
            </p>
            <p className="text-sm text-slate-500">Bot Token</p>
          </div>
        </div>
      </div>

      <LlmInterpretHealthCard />

      {settingsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : settingsData ? (
        <TelegramConfigForm
          key={JSON.stringify(settingsData.settings)}
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
