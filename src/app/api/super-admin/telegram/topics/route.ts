import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { getPlatformSetting, setPlatformSetting } from "@/lib/telegram";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  requireRole(user, ["superadmin"]);

  const { name, iconColor, iconCustomEmojiId } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Topic name is required" }, { status: 400 });
  }

  const botToken = await getPlatformSetting("telegram_bot_token");
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 400 });
  }

  const supergroupId = await getPlatformSetting("telegram_supergroup_id");
  if (!supergroupId) {
    return NextResponse.json({ error: "Supergroup ID not configured" }, { status: 400 });
  }

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/createForumTopic`;
  const body: Record<string, unknown> = {
    chat_id: Number(supergroupId),
    name,
  };
  if (iconColor !== undefined) body.icon_color = Number(iconColor);
  if (iconCustomEmojiId) body.icon_custom_emoji_id = iconCustomEmojiId;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json(
        { error: data.description || "Failed to create forum topic" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      topic: {
        messageThreadId: data.result.message_thread_id,
        name: data.result.name,
        iconColor: data.result.icon_color,
        iconCustomEmojiId: data.result.icon_custom_emoji_id,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to reach Telegram API" }, { status: 500 });
  }
}
