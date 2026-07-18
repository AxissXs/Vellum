import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramPairingCodes, telegramTopicCodes, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import {
  getBotToken,
  readWebhookSecretToken,
  sendTelegramMessage,
  setPlatformSetting,
  getPlatformSetting,
} from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const token = await getBotToken();
  if (!token) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 400 });
  }

  const secretToken = await readWebhookSecretToken();
  if (!secretToken) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }
  const providedSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (providedSecret !== secretToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = update?.message;
  if (!message || !message.text) {
    return NextResponse.json({ ok: true });
  }

  const text: string = message.text;
  const chatId = String(message.chat.id);
  const username = message.from?.username || null;
  const threadId = message.message_thread_id
    ? String(message.message_thread_id)
    : undefined;

  const reply = (msg: string) =>
    sendTelegramMessage(chatId, msg, { topicId: threadId });

  // Handle /start <code>
  if (text.startsWith("/start ")) {
    const code = text.slice(7).trim().toUpperCase();

    const [pairing] = await db
      .select()
      .from(telegramPairingCodes)
      .where(
        and(
          eq(telegramPairingCodes.code, code),
          eq(telegramPairingCodes.used, false),
          gt(telegramPairingCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!pairing) {
      await reply("Invalid or expired pairing code. Please generate a new code in Vellum settings.");
      return NextResponse.json({ ok: true });
    }

    // Link the user's Telegram
    await db
      .update(users)
      .set({ telegramChatId: chatId, telegramUsername: username })
      .where(eq(users.id, pairing.userId));

    // Mark code as used
    await db
      .update(telegramPairingCodes)
      .set({ used: true })
      .where(eq(telegramPairingCodes.id, pairing.id));

    await reply(
      "Your Telegram has been linked to Vellum. You will now receive notifications here based on your preferences."
    );

    return NextResponse.json({ ok: true });
  }

  // Handle /bindtopic <code>
  if (text.startsWith("/bindtopic ")) {
    const code = text.slice(11).trim().toUpperCase();

    if (!threadId) {
      await reply("This command must be sent inside a forum topic.");
      return NextResponse.json({ ok: true });
    }

    const [topicCode] = await db
      .select()
      .from(telegramTopicCodes)
      .where(
        and(
          eq(telegramTopicCodes.code, code),
          eq(telegramTopicCodes.used, false),
          gt(telegramTopicCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!topicCode) {
      await reply("Invalid or expired binding code. Generate a new one in the Vellum super admin panel.");
      return NextResponse.json({ ok: true });
    }

    await setPlatformSetting(`telegram_topic_${topicCode.eventType}`, threadId);

    await db
      .update(telegramTopicCodes)
      .set({ used: true })
      .where(eq(telegramTopicCodes.id, topicCode.id));

    await reply(
      `This topic is now bound to <b>${topicCode.eventType}</b> notifications.`
    );

    return NextResponse.json({ ok: true });
  }

  // Handle /pairgroup <code>
  if (text.startsWith("/pairgroup ")) {
    const code = text.slice(11).trim().toUpperCase();

    if (message.chat.type !== "supergroup") {
      await reply("This command must be sent inside the supergroup you want to pair.");
      return NextResponse.json({ ok: true });
    }

    const storedCode = await getPlatformSetting("telegram_supergroup_pairing_code");
    const expiresRaw = await getPlatformSetting("telegram_supergroup_pairing_expires");

    if (!storedCode || storedCode !== code) {
      await reply("Invalid pairing code. Generate a new one in the Vellum super admin panel.");
      return NextResponse.json({ ok: true });
    }

    if (!expiresRaw || Date.now() > Number(expiresRaw)) {
      await reply("Pairing code has expired. Generate a new one in the Vellum super admin panel.");
      return NextResponse.json({ ok: true });
    }

    await setPlatformSetting("telegram_supergroup_id", chatId);
    await setPlatformSetting("telegram_supergroup_pairing_code", null);
    await setPlatformSetting("telegram_supergroup_pairing_expires", null);

    await reply(
      `This supergroup <b>${message.chat.title}</b> is now paired with Vellum. Supergroup ID: <code>${chatId}</code>`
    );

    return NextResponse.json({ ok: true });
  }

  // Handle plain /start
  if (text === "/start") {
    await reply(
      "Welcome to Vellum! To link your account, go to Settings in Vellum and generate a pairing code, then send it here with /start <code>."
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
