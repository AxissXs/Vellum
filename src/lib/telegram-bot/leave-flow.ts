import type { AuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { sendTelegramMessage } from "@/lib/telegram";
import { createScheduleForUser } from "@/lib/create-schedule";
import { getAppTimezone } from "@/lib/timezone-server";
import { parseLeaveRange } from "@/lib/telegram-dates";
import { calendarDeepLink } from "@/lib/telegram-bot/auth";
import { escapeHtml } from "@/lib/telegram-bot/format";

export async function handleLeaveCommand(
  user: AuthUser,
  chatId: string,
  argsText: string
) {
  if (!hasPermission(user.role, "create_own_schedule")) {
    await sendTelegramMessage(chatId, "You don't have permission to create leave.");
    return;
  }

  const args = argsText.trim()
    ? argsText.trim().split("|").map((s) => s.trim())
    : [];
  if (!args.length) {
    await sendTelegramMessage(
      chatId,
      "Use: /leave today | tomorrow | start | end\nExample: /leave 2026-07-20 | 2026-07-22"
    );
    return;
  }

  const tz = await getAppTimezone();
  const parsed =
    args.length === 1 && !args[0].includes("-")
      ? parseLeaveRange([args[0].toLowerCase()], tz)
      : parseLeaveRange(args, tz);

  if (!parsed.ok) {
    await sendTelegramMessage(chatId, parsed.error);
    return;
  }

  const { schedule, conflicts } = await createScheduleForUser(user, {
    title: "Leave",
    type: "leave",
    allDay: true,
    visibility: "team",
    startsAt: parsed.startsAt,
    endsAt: parsed.endsAt,
  });

  let msg = `✅ Leave scheduled: <b>${escapeHtml(schedule.title)}</b>`;
  if (conflicts.length) {
    msg += `\n⚠ ${conflicts.length} task due-date conflict(s).`;
  }
  msg += `\n<a href="${calendarDeepLink()}">Open calendar</a>`;
  await sendTelegramMessage(chatId, msg);
}
