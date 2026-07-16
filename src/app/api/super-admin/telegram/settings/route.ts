import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import {
  getPlatformSetting,
  setPlatformSetting,
  TELEGRAM_EVENT_TYPES,
  getWebhookUrl,
  setTelegramWebhook,
} from "@/lib/telegram";

const DIRECT_KEYS = [
  "telegram_bot_token",
  "telegram_supergroup_id",
  "telegram_channel_id",
];

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  requireRole(user, ["superadmin"]);

  const settings: Record<string, string | null> = {};
  for (const key of DIRECT_KEYS) {
    settings[key] = await getPlatformSetting(key);
  }

  const topics: Record<string, string | null> = {};
  for (const ev of TELEGRAM_EVENT_TYPES) {
    topics[ev] = await getPlatformSetting(`telegram_topic_${ev}`);
  }

  const channelEventsRaw = await getPlatformSetting("telegram_channel_events");
  const channelEvents = channelEventsRaw
    ? channelEventsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const templates: Record<string, string | null> = {};
  for (const ev of TELEGRAM_EVENT_TYPES) {
    templates[ev] = await getPlatformSetting(`telegram_template_${ev}`);
  }

  return NextResponse.json({
    settings,
    topics,
    channelEvents,
    templates,
    webhookUrl: getWebhookUrl(),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  requireRole(user, ["superadmin"]);

  const body = await req.json();

  // Direct settings
  for (const key of DIRECT_KEYS) {
    if (body[key] !== undefined) {
      await setPlatformSetting(key, body[key] || null);
    }
  }

  // Topic mappings
  if (body.topics) {
    for (const ev of TELEGRAM_EVENT_TYPES) {
      if (body.topics[ev] !== undefined) {
        await setPlatformSetting(`telegram_topic_${ev}`, body.topics[ev] || null);
      }
    }
  }

  // Channel events
  if (body.channelEvents !== undefined) {
    await setPlatformSetting(
      "telegram_channel_events",
      body.channelEvents.join(",") || null
    );
  }

  // Templates
  if (body.templates) {
    for (const ev of TELEGRAM_EVENT_TYPES) {
      if (body.templates[ev] !== undefined) {
        await setPlatformSetting(`telegram_template_${ev}`, body.templates[ev] || null);
      }
    }
  }

  // Auto-set webhook on token change
  if (body.telegram_bot_token) {
    const webhookUrl = getWebhookUrl();
    if (webhookUrl) {
      const result = await setTelegramWebhook(webhookUrl, body.telegram_bot_token);
      if (!result.ok) {
        return NextResponse.json({
          error: `Settings saved, but failed to set webhook: ${result.description || "unknown"}`,
          webhookSet: false,
        }, { status: 200 });
      }
    }
  }

  const response: Record<string, unknown> = {};
  for (const key of DIRECT_KEYS) {
    response[key] = await getPlatformSetting(key);
  }

  return NextResponse.json({ settings: response, webhookSet: true });
}
