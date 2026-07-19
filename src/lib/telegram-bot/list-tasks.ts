import type { AuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAppTimezone } from "@/lib/timezone-server";
import { sendTelegramMessage } from "@/lib/telegram";
import { queryTasks, resolveUserByTelegramRef } from "@/lib/query-tasks";
import { resolveRange } from "@/lib/telegram-dates";
import {
  buildListMessage,
  formatTaskLine,
  splitPages,
} from "@/lib/telegram-bot/format";
import {
  PAGE_SIZE,
  paginationKeyboard,
  taskActionKeyboard,
} from "@/lib/telegram-bot/keyboards";

export async function handleListTasks(
  user: AuthUser,
  chatId: string,
  args: string[],
  page = 0
) {
  if (!hasPermission(user.role, "view_tasks")) {
    await sendTelegramMessage(chatId, "You don't have permission to view tasks.");
    return;
  }

  const tz = await getAppTimezone();
  let assigneeId = user.id;
  const filters: Parameters<typeof queryTasks>[0] = {
    excludeDone: true,
  };

  const sub = args[0]?.toLowerCase();
  if (sub === "today") {
    const range = resolveRange("today", tz);
    filters.assigneeId = user.id;
    filters.dueFrom = range.from;
    filters.dueTo = range.to;
  } else if (sub === "week") {
    const range = resolveRange("week", tz);
    filters.assigneeId = user.id;
    filters.dueFrom = range.from;
    filters.dueTo = range.to;
  } else if (sub === "project" && args[1]) {
    filters.assigneeId = user.id;
    filters.projectName = args.slice(1).join(" ");
  } else if (sub?.startsWith("@")) {
    const ref = sub;
    if (user.role === "member") {
      await sendTelegramMessage(chatId, "Only admins can view another user's tasks.");
      return;
    }
    const target = await resolveUserByTelegramRef(ref);
    if (!target) {
      await sendTelegramMessage(chatId, `User not found: ${ref}`);
      return;
    }
    assigneeId = target.id;
    filters.assigneeId = assigneeId;
  } else {
    filters.assigneeId = user.id;
  }

  const rows = await queryTasks(filters);
  const pages = splitPages(rows, PAGE_SIZE);
  const safePage = Math.min(page, pages.length - 1);
  const slice = pages[safePage] ?? [];

  const header =
    assigneeId === user.id
      ? `Tasks (${rows.length})`
      : `Tasks for user (${rows.length})`;

  const lines = slice.map((t) => formatTaskLine(t, tz));
  const text = buildListMessage(header, lines, safePage, pages.length);

  const keyboard = paginationKeyboard("lt", safePage, pages.length);
  const lastRow = keyboard?.inline_keyboard[0] ?? [];

  if (hasPermission(user.role, "edit_tasks") && slice.length > 0) {
    const actionRows = slice.slice(0, 3).map((t) => taskActionKeyboard(t.id).inline_keyboard[0]);
    await sendTelegramMessage(chatId, text, {
      replyMarkup: {
        inline_keyboard: [...actionRows, ...(lastRow.length ? [lastRow] : [])],
      },
    });
    return;
  }

  await sendTelegramMessage(chatId, text, { replyMarkup: keyboard });
}
