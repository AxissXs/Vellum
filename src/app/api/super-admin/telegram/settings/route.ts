import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { setPlatformSetting } from "@/lib/platform-settings";
import {
  getPlatformSetting,
  TELEGRAM_EVENT_TYPES,
  getWebhookUrl,
  setTelegramWebhook,
} from "@/lib/telegram";

const DIRECT_KEYS = [
  "telegram_bot_token",
  "telegram_supergroup_id",
  "telegram_channel_id",
] as const;

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    requireRole(user, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const supergroupEventsRaw = await getPlatformSetting(
    "telegram_supergroup_events"
  );
  const supergroupEvents = supergroupEventsRaw
    ? supergroupEventsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const templates: Record<string, string | null> = {};
  for (const ev of TELEGRAM_EVENT_TYPES) {
    templates[ev] = await getPlatformSetting(`telegram_template_${ev}`);
  }

  return NextResponse.json({
    settings,
    topics,
    channelEvents,
    supergroupEvents,
    templates,
    webhookUrl: getWebhookUrl(),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    requireRole(user, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  for (const key of DIRECT_KEYS) {
    if (body[key] !== undefined) {
      await setPlatformSetting(key, body[key] || null);
    }
  }

  if (body.topics && typeof body.topics === "object") {
    for (const ev of TELEGRAM_EVENT_TYPES) {
      if (body.topics[ev] !== undefined) {
        await setPlatformSetting(
          `telegram_topic_${ev}`,
          body.topics[ev] || null
        );
      }
    }
  }

  if (body.channelEvents !== undefined) {
    const list = Array.isArray(body.channelEvents)
      ? body.channelEvents.filter((e: unknown) => typeof e === "string")
      : [];
    await setPlatformSetting(
      "telegram_channel_events",
      list.length ? list.join(",") : null
    );
  }

  if (body.supergroupEvents !== undefined) {
    const list = Array.isArray(body.supergroupEvents)
      ? body.supergroupEvents.filter((e: unknown) => typeof e === "string")
      : [];
    await setPlatformSetting(
      "telegram_supergroup_events",
      list.length ? list.join(",") : null
    );
  }

  if (body.templates && typeof body.templates === "object") {
    for (const ev of TELEGRAM_EVENT_TYPES) {
      if (body.templates[ev] !== undefined) {
        await setPlatformSetting(
          `telegram_template_${ev}`,
          body.templates[ev] || null
        );
      }
    }
  }

  let webhookSet: boolean | null = null;
  let webhookError: string | null = null;

  const shouldSetWebhook =
    Boolean(body.telegram_bot_token) || body.setWebhook === true;
  if (shouldSetWebhook) {
    const origin =
      typeof body.webhookOrigin === "string" ? body.webhookOrigin : null;
    const webhookUrl = getWebhookUrl(origin);
    if (webhookUrl) {
      const tokenOverride =
        typeof body.telegram_bot_token === "string" && body.telegram_bot_token
          ? body.telegram_bot_token
          : undefined;
      const result = await setTelegramWebhook(webhookUrl, tokenOverride);
      webhookSet = result.ok;
      if (!result.ok) {
        webhookError = result.description || "Failed to set webhook";
      }
    } else {
      webhookSet = false;
      webhookError =
        "No webhook URL (set NEXT_PUBLIC_APP_URL or pass webhookOrigin)";
    }
  }

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

  const supergroupEventsRaw = await getPlatformSetting(
    "telegram_supergroup_events"
  );
  const supergroupEvents = supergroupEventsRaw
    ? supergroupEventsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const templates: Record<string, string | null> = {};
  for (const ev of TELEGRAM_EVENT_TYPES) {
    templates[ev] = await getPlatformSetting(`telegram_template_${ev}`);
  }

  return NextResponse.json({
    settings,
    topics,
    channelEvents,
    supergroupEvents,
    templates,
    webhookUrl: getWebhookUrl(
      typeof body.webhookOrigin === "string" ? body.webhookOrigin : null
    ),
    webhookSet,
    webhookError,
  });
}
