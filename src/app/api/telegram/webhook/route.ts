import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramPairingCodes, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { getBotToken, sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const token = await getBotToken();
  if (!token) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 400 });
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
      await sendTelegramMessage(chatId, "Invalid or expired pairing code. Please generate a new code in Perfect settings.");
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

    await sendTelegramMessage(
      chatId,
      "Your Telegram has been linked to Perfect. You will now receive notifications here based on your preferences."
    );

    return NextResponse.json({ ok: true });
  }

  // Handle plain /start
  if (text === "/start") {
    await sendTelegramMessage(
      chatId,
      "Welcome to Perfect! To link your account, go to Settings in Perfect and generate a pairing code, then send it here with /start <code>."
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
