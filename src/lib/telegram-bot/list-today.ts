import type { AuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAppTimezone } from "@/lib/timezone-server";
import { sendTelegramMessage } from "@/lib/telegram";
import { queryCalendar } from "@/lib/query-calendar";
import { queryTasks } from "@/lib/query-tasks";
import { resolveRange } from "@/lib/telegram-dates";
import { formatScheduleLine, formatTaskLine } from "@/lib/telegram-bot/format";
import { calendarDeepLink } from "@/lib/telegram-bot/auth";

export async function handleTodayDigest(user: AuthUser, chatId: string) {
  const tz = await getAppTimezone();
  const range = resolveRange("today", tz);

  const parts: string[] = ["<b>Today</b>"];

  if (hasPermission(user.role, "view_calendar")) {
    const cal = await queryCalendar(user, {
      from: range.from,
      to: range.to,
      scope: "me",
      layers: ["schedules", "tasks"],
    });
    parts.push(`\n<b>Events (${cal.schedules.length})</b>`);
    if (cal.schedules.length) {
      parts.push(
        ...cal.schedules
          .slice(0, 8)
          .map((e) => formatScheduleLine(e, tz))
      );
    } else {
      parts.push("<i>No events</i>");
    }

    parts.push(`\n<b>Due tasks (${cal.tasks.length})</b>`);
    if (cal.tasks.length) {
      parts.push(
        ...cal.tasks.slice(0, 8).map((t) =>
          formatTaskLine(
            {
              title: t.title,
              status: t.status,
              dueDate: new Date(t.dueDate),
            },
            tz
          )
        )
      );
    } else {
      parts.push("<i>No tasks due</i>");
    }

    if (cal.conflicts.length) {
      parts.push(`\n<b>⚠ Leave conflicts (${cal.conflicts.length})</b>`);
      for (const c of cal.conflicts.slice(0, 5)) {
        parts.push(`• ${c.taskTitle} due during ${c.scheduleTitle}`);
      }
    }
  } else if (hasPermission(user.role, "view_tasks")) {
    const tasks = await queryTasks({
      assigneeId: user.id,
      dueFrom: range.from,
      dueTo: range.to,
      excludeDone: true,
    });
    parts.push(`\n<b>Due tasks (${tasks.length})</b>`);
    parts.push(
      tasks.length
        ? tasks.slice(0, 8).map((t) => formatTaskLine(t, tz)).join("\n")
        : "<i>No tasks due</i>"
    );
  }

  parts.push(`\n<a href="${calendarDeepLink()}">Open calendar</a>`);
  await sendTelegramMessage(chatId, parts.join("\n"));
}
