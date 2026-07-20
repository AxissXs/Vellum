import { db } from "@/db";
import { users, notificationPreferences } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getPlatformSetting,
  setPlatformSetting,
} from "@/lib/platform-settings";

export { getPlatformSetting, setPlatformSetting };

const TELEGRAM_API_BASE = "https://api.telegram.org";

export const TELEGRAM_EVENT_TYPES = [
  "task_assigned",
  "task_mentioned",
  "due_date_approaching",
  "status_changed",
  "new_comment",
  "comment_mention",
  "schedule_assigned",
] as const;

export type TelegramEventType = (typeof TELEGRAM_EVENT_TYPES)[number];

export async function getBotToken(): Promise<string | null> {
  return getPlatformSetting("telegram_bot_token");
}

export async function isTelegramConfigured(): Promise<boolean> {
  const token = await getBotToken();
  return !!token;
}

export function getWebhookUrl(overrideOrigin?: string | null): string | null {
  const baseUrl =
    overrideOrigin?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    null;
  if (!baseUrl) return null;
  return `${baseUrl}/api/telegram/webhook`;
}

export async function getTelegramTopicMapping(
  eventType: string
): Promise<string | null> {
  return getPlatformSetting(`telegram_topic_${eventType}`);
}

export async function getChannelEvents(): Promise<string[]> {
  const raw = await getPlatformSetting("telegram_channel_events");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function setChannelEvents(events: string[]) {
  await setPlatformSetting(
    "telegram_channel_events",
    events.length ? events.join(",") : null
  );
}

export async function getSupergroupEvents(): Promise<string[]> {
  const raw = await getPlatformSetting("telegram_supergroup_events");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function setSupergroupEvents(events: string[]) {
  await setPlatformSetting(
    "telegram_supergroup_events",
    events.length ? events.join(",") : null
  );
}

export async function getTelegramTemplate(
  eventType: string
): Promise<string | null> {
  return getPlatformSetting(`telegram_template_${eventType}`);
}

export async function setTelegramTemplate(
  eventType: string,
  template: string | null
) {
  await setPlatformSetting(`telegram_template_${eventType}`, template);
}

export function getDefaultTemplate(_eventType: string): string {
  return "<b>{title}</b>\n\n{content}";
}

function interpolateTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined ? escapeHtml(val) : `{${key}}`;
  });
}

async function telegramApi<T = unknown>(
  method: string,
  body: Record<string, unknown>,
  token?: string
): Promise<{ ok: boolean; result?: T; description?: string }> {
  const botToken = token ?? (await getBotToken());
  if (!botToken) {
    return { ok: false, description: "Bot token not configured" };
  }

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return data as { ok: boolean; result?: T; description?: string };
}

export async function getTelegramBotInfo(token?: string): Promise<{
  ok: boolean;
  username?: string;
  firstName?: string;
  description?: string;
}> {
  const data = await telegramApi<{ username?: string; first_name?: string }>(
    "getMe",
    {},
    token
  );

  if (!data.ok) {
    return {
      ok: false,
      description: data.description || "Failed to get bot info",
    };
  }

  return {
    ok: true,
    username: data.result?.username,
    firstName: data.result?.first_name,
  };
}

export async function getWebhookSecretToken(): Promise<string> {
  let secret = await getPlatformSetting("telegram_webhook_secret");
  if (!secret) {
    secret = crypto.randomUUID().replace(/-/g, "");
    await setPlatformSetting("telegram_webhook_secret", secret);
  }
  return secret;
}

export async function setTelegramWebhook(webhookUrl: string, token?: string) {
  const secretToken = await getWebhookSecretToken();
  return telegramApi(
    "setWebhook",
    {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
      secret_token: secretToken,
    },
    token
  );
}

export type InlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2" | null;
    disablePreview?: boolean;
    topicId?: string;
    replyMarkup?: InlineKeyboardMarkup;
  },
  token?: string
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: options?.disablePreview ?? true,
  };
  if (options?.parseMode !== null) {
    body.parse_mode = options?.parseMode ?? "HTML";
  }
  if (options?.topicId) {
    body.message_thread_id = Number(options.topicId);
  }
  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }
  return telegramApi("sendMessage", body, token);
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  options?: { text?: string; showAlert?: boolean },
  token?: string
) {
  return telegramApi(
    "answerCallbackQuery",
    {
      callback_query_id: callbackQueryId,
      text: options?.text,
      show_alert: options?.showAlert ?? false,
    },
    token
  );
}

export async function editMessageText(
  chatId: string,
  messageId: number,
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    replyMarkup?: InlineKeyboardMarkup;
  },
  token?: string
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options?.parseMode ?? "HTML",
    disable_web_page_preview: true,
  };
  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }
  return telegramApi("editMessageText", body, token);
}

export async function isTelegramEnabled(
  userId: string,
  eventType: string
): Promise<boolean> {
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.eventType, eventType as never)
      )
    )
    .limit(1);

  if (prefs.length === 0) return false;
  return prefs[0].telegramEnabled;
}

export async function sendTelegramNotification({
  userId,
  eventType,
  title,
  content,
  url,
}: {
  userId: string;
  eventType: string;
  title: string;
  content: string;
  url?: string;
}) {
  if (!userId) return;

  const enabled = await isTelegramEnabled(userId, eventType);
  if (!enabled) return;

  const userRows = await db
    .select({ telegramChatId: users.telegramChatId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const chatId = userRows[0]?.telegramChatId;
  if (!chatId) return;

  const configured = await isTelegramConfigured();
  if (!configured) return;

  const customTemplate = await getTelegramTemplate(eventType);
  const template = customTemplate || getDefaultTemplate(eventType);

  const vars: Record<string, string> = { title, content };
  if (url) vars.url = url;

  let text = interpolateTemplate(template, vars);
  if (url && !text.includes("<a ")) {
    text += `\n\n<a href="${escapeHtml(url)}">Open in Perfect</a>`;
  }

  const result = await sendTelegramMessage(chatId, text, { parseMode: "HTML" });
  if (!result.ok) {
    console.error(
      "[telegram] sendMessage failed:",
      result.description || "unknown error",
      { chatId, eventType }
    );
  }
}

export async function broadcastToSupergroup(eventType: string, text: string) {
  const allowed = await getSupergroupEvents();
  if (!allowed.includes(eventType)) {
    return { ok: false, description: "Event not enabled for supergroup" };
  }

  const supergroupId = await getPlatformSetting("telegram_supergroup_id");
  if (!supergroupId) {
    return { ok: false, description: "Supergroup not configured" };
  }

  const topicId = await getTelegramTopicMapping(eventType);

  const result = await sendTelegramMessage(supergroupId, text, {
    parseMode: "HTML",
    topicId: topicId ?? undefined,
  });
  if (!result.ok) {
    console.error(
      "[telegram] supergroup broadcast failed:",
      result.description || "unknown error",
      { eventType }
    );
  }
  return result;
}

export async function maybeBroadcastToChannel(
  eventType: string,
  title: string,
  content: string,
  url?: string
) {
  const channelEvents = await getChannelEvents();
  if (!channelEvents.includes(eventType)) {
    return { ok: false, description: "Event not enabled for channel" };
  }

  const channelId = await getPlatformSetting("telegram_channel_id");
  if (!channelId) {
    return { ok: false, description: "Channel not configured" };
  }

  const customTemplate = await getTelegramTemplate(eventType);
  const template = customTemplate || getDefaultTemplate(eventType);

  const vars: Record<string, string> = { title, content };
  if (url) vars.url = url;

  let text = interpolateTemplate(template, vars);
  if (url && !text.includes("<a ")) {
    text += `\n\n<a href="${escapeHtml(url)}">Open in Perfect</a>`;
  }

  const result = await sendTelegramMessage(channelId, text, {
    parseMode: "HTML",
  });
  if (!result.ok) {
    console.error(
      "[telegram] channel broadcast failed:",
      result.description || "unknown error",
      { eventType }
    );
  }
  return result;
}

/** @deprecated Prefer maybeBroadcastToChannel */
export async function broadcastToChannel(text: string) {
  const channelId = await getPlatformSetting("telegram_channel_id");
  if (!channelId) {
    return { ok: false, description: "Channel not configured" };
  }

  return sendTelegramMessage(channelId, text, { parseMode: "HTML" });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
