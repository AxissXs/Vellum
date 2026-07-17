import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramPairingCodes, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import {
  getBotToken,
  getWebhookSecretToken,
  sendTelegramMessage,
} from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const token = await getBotToken();
  if (!token) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 400 });
  }

  const secretToken = await getWebhookSecretToken();
  const providedSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (providedSecret !== secretToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: unknown;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (update as { message?: { text?: string; chat?: { id: number }; from?: { username?: string } } })
    ?.message;
  if (!message || !message.text) {
    return NextResponse.json({ ok: true });
  }

  const text: string = message.text;
  const chatId = String(message.chat?.id);
  const username = message.from?.username || null;

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
      await sendTelegramMessage(
        chatId,
        "Invalid or expired pairing code. Please generate a new code in Perfect settings."
      );
      return NextResponse.json({ ok: true });
    }

    await db
      .update(users)
      .set({ telegramChatId: chatId, telegramUsername: username })
      .where(eq(users.id, pairing.userId));

    await db
      .update(telegramPairingCodes)
      .set({ used: true })
      .where(eq(telegramPairingCodes.id, pairing.id));

    await sendTelegramMessage(
      chatId,
      "Your Telegram has been linked to Perfect. You will now receive notifications here based on your preferences."
    );

    return NextResponse.json({ ok: true });
  }

  if (text === "/start") {
    await sendTelegramMessage(
      chatId,
      "Welcome to Perfect! To link your account, go to Settings in Perfect and generate a pairing code, then send it here with /start <code>."
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
