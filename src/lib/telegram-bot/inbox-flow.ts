import type { AuthUser } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";
import {
  markAllNotificationsRead,
  markNotificationRead,
  queryNotificationsForUser,
} from "@/lib/query-notifications";
import { notificationKeyboard } from "@/lib/telegram-bot/keyboards";
import { escapeHtml, truncate } from "@/lib/telegram-bot/format";

export async function handleInboxCommand(
  user: AuthUser,
  chatId: string,
  args: string[]
) {
  const all = args[0]?.toLowerCase() === "all";
  const rows = await queryNotificationsForUser(user.id, {
    unreadOnly: !all,
    limit: 10,
  });

  if (!rows.length) {
    await sendTelegramMessage(chatId, all ? "No notifications." : "No unread notifications.");
    return;
  }

  const lines = rows.map(
    (n, i) =>
      `${i + 1}. ${n.read ? "✓" : "•"} <b>${escapeHtml(truncate(n.title, 40))}</b>\n   ${escapeHtml(truncate(n.content, 60))}`
  );

  await sendTelegramMessage(
    chatId,
    `<b>Inbox</b> (${rows.length})\n${lines.join("\n")}`,
    {
      replyMarkup: {
        inline_keyboard: [
          ...rows.slice(0, 3).map((n) =>
            notificationKeyboard(n.id, n.entityType, n.entityId).inline_keyboard[0]
          ),
          [{ text: "Mark all read", callback_data: "nr:all" }],
        ],
      },
    }
  );
}

export async function handleInboxCallback(
  user: AuthUser,
  chatId: string,
  data: string
) {
  if (data === "nr:all") {
    await markAllNotificationsRead(user);
    await sendTelegramMessage(chatId, "✅ All marked read.");
    return;
  }
  const id = data.slice(3);
  const row = await markNotificationRead(user, id);
  if (row) {
    await sendTelegramMessage(chatId, "✅ Marked read.");
  } else {
    await sendTelegramMessage(chatId, "Notification not found.");
  }
}
