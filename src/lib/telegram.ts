import { db } from "@/db";
import { platformSettings, users, notificationPreferences } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export async function getPlatformSetting(key: string): Promise<string | null> {
  if (typeof window !== "undefined") return null;
  const rows = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setPlatformSetting(key: string, value: string | null) {
  if (typeof window !== "undefined") return;
  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(platformSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(platformSettings.id, existing[0].id));
  } else {
    await db.insert(platformSettings).values({ key, value });
  }
}

export async function getBotToken(): Promise<string | null> {
  return getPlatformSetting("telegram_bot_token");
}

export async function isTelegramConfigured(): Promise<boolean> {
  const token = await getBotToken();
  return !!token;
}

async function telegramApi<T = any>(
  method: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; result?: T; description?: string }> {
  const token = await getBotToken();
  if (!token) {
    return { ok: false, description: "Bot token not configured" };
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return data as { ok: boolean; result?: T; description?: string };
}

export async function getTelegramBotInfo(): Promise<{
  ok: boolean;
  username?: string;
  firstName?: string;
  description?: string;
}> {
  const data = await telegramApi<{ username?: string; first_name?: string }>(
    "getMe",
    {}
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

export async function setTelegramWebhook(webhookUrl: string) {
  const data = await telegramApi("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message"],
  });
  return data;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parseMode?: "HTML" | "Markdown" | "MarkdownV2"; disablePreview?: boolean }
) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode ?? "HTML",
    disable_web_page_preview: options?.disablePreview ?? true,
  });
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
        eq(notificationPreferences.eventType, eventType as any)
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

  const text = url
    ? `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(content)}\n\n<a href="${escapeHtml(url)}">Open in Perfect</a>`
    : `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(content)}`;

  await sendTelegramMessage(chatId, text, { parseMode: "HTML" });
}

export async function broadcastToSupergroup(
  text: string,
  topicId?: string
) {
  const supergroupId = await getPlatformSetting("telegram_supergroup_id");
  if (!supergroupId) return { ok: false, description: "Supergroup not configured" };

  const body: Record<string, unknown> = {
    chat_id: supergroupId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (topicId) {
    body.message_thread_id = Number(topicId);
  }

  return telegramApi("sendMessage", body);
}

export async function broadcastToChannel(text: string) {
  const channelId = await getPlatformSetting("telegram_channel_id");
  if (!channelId) return { ok: false, description: "Channel not configured" };

  return telegramApi("sendMessage", {
    chat_id: channelId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
