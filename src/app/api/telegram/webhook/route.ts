import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramPairingCodes, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import {
  getBotToken,
  getWebhookSecretToken,
  sendTelegramMessage,
} from "@/lib/telegram";
import { handleTelegramUpdate } from "@/lib/telegram-bot";

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

  const message = (update as { message?: { text?: string; chat?: { id: number; type?: string }; from?: { username?: string } } })
    ?.message;
  const callbackQuery = (update as { callback_query?: unknown })?.callback_query;

  if (message?.text && message.chat?.id) {
    const text: string = message.text;
    const chatId = String(message.chat.id);
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
        "Your Telegram has been linked to Perfect. Send /help to see bot commands."
      );

      return NextResponse.json({ ok: true });
    }

    if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        "Welcome to Perfect! To link your account, go to Settings in Perfect and generate a pairing code, then send it here with /start &lt;code&gt;.\n\nAfter linking, send /help for commands."
      );
      return NextResponse.json({ ok: true });
    }
  }

  try {
    await handleTelegramUpdate(
      update as {
        message?: Parameters<typeof handleTelegramUpdate>[0]["message"];
        callback_query?: Parameters<typeof handleTelegramUpdate>[0]["callback_query"];
      }
    );
  } catch (err) {
    console.error("[telegram webhook]", err);
    // Best-effort error reply so users aren't left with silence.
    const chatId = message?.chat?.id
      ? String(message.chat.id)
      : (callbackQuery as { message?: { chat?: { id: number } } } | undefined)
          ?.message?.chat?.id
        ? String(
            (callbackQuery as { message: { chat: { id: number } } }).message
              .chat.id
          )
        : null;
    if (chatId) {
      try {
        await sendTelegramMessage(
          chatId,
          "Something went wrong handling that command. Try again, or check that the app finished deploying migrations."
        );
      } catch {
        /* ignore */
      }
    }
  }

  return NextResponse.json({ ok: true });
}
