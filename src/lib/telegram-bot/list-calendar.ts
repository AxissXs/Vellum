import type { AuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAppTimezone } from "@/lib/timezone-server";
import { sendTelegramMessage } from "@/lib/telegram";
import { queryCalendar } from "@/lib/query-calendar";
import { resolveRange } from "@/lib/telegram-dates";
import { resolveUserByTelegramRef } from "@/lib/query-tasks";
import {
  buildListMessage,
  formatScheduleLine,
  splitPages,
} from "@/lib/telegram-bot/format";
import { PAGE_SIZE, paginationKeyboard } from "@/lib/telegram-bot/keyboards";

export async function handleListCalendar(
  user: AuthUser,
  chatId: string,
  args: string[],
  page = 0
) {
  if (!hasPermission(user.role, "view_calendar")) {
    await sendTelegramMessage(chatId, "You don't have permission to view the calendar.");
    return;
  }

  const tz = await getAppTimezone();
  let preset: "today" | "tomorrow" | "week" = "today";
  let scope: "me" | "team" = "me";
  let filterUserId: string | null = null;

  const lower = args.map((a) => a.toLowerCase());
  if (lower.includes("team")) {
    scope = "team";
  }
  if (lower.includes("tomorrow")) preset = "tomorrow";
  else if (lower.includes("week")) preset = "week";

  const atUser = args.find((a) => a.startsWith("@"));
  if (atUser) {
    if (user.role === "member") {
      await sendTelegramMessage(chatId, "Only admins can filter calendar by user.");
      return;
    }
    const target = await resolveUserByTelegramRef(atUser);
    if (!target) {
      await sendTelegramMessage(chatId, `User not found: ${atUser}`);
      return;
    }
    filterUserId = target.id;
    scope = "team";
  }

  const range = resolveRange(preset, tz);
  const data = await queryCalendar(user, {
    from: range.from,
    to: range.to,
    scope,
    filterUserId,
    layers: ["schedules"],
  });

  const events = data.schedules.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );
  const pages = splitPages(events, PAGE_SIZE);
  const safePage = Math.min(page, Math.max(pages.length - 1, 0));
  const slice = pages[safePage] ?? [];

  const header = `Calendar — ${scope === "team" ? "team" : "me"} / ${range.label} (${events.length})`;
  const lines = slice.map((e) => formatScheduleLine(e, tz));
  const text = buildListMessage(header, lines, safePage, pages.length);

  await sendTelegramMessage(chatId, text, {
    replyMarkup: paginationKeyboard("lc", safePage, pages.length),
  });
}
