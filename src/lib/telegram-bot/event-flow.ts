import type { AuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { sendTelegramMessage } from "@/lib/telegram";
import { createScheduleForUser } from "@/lib/create-schedule";
import { getAppTimezone } from "@/lib/timezone-server";
import {
  parseEndOrDuration,
  parseTelegramDateTime,
  formatTelegramDateTime,
} from "@/lib/telegram-dates";
import {
  clearSession,
  getSession,
  updateSessionPayload,
  upsertSession,
} from "@/lib/telegram-bot/sessions";
import { choiceKeyboard, confirmKeyboard } from "@/lib/telegram-bot/keyboards";
import { escapeHtml } from "@/lib/telegram-bot/format";
import { calendarDeepLink } from "@/lib/telegram-bot/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const EVENT_TYPES = ["work", "meeting", "leave", "training", "other"] as const;

export async function handleEventCommand(
  user: AuthUser,
  chatId: string,
  argsText: string
) {
  const trimmed = argsText.trim();
  if (trimmed.includes("|")) {
    return handleEventOneShot(user, chatId, trimmed);
  }

  await upsertSession({
    userId: user.id,
    chatId,
    flow: "event",
    step: trimmed ? "start" : "title",
    payload: trimmed ? { title: trimmed } : {},
  });

  if (trimmed) {
    await sendTelegramMessage(
      chatId,
      `Event: <b>${escapeHtml(trimmed)}</b>\nSend <b>start</b> (e.g. tomorrow 10:00):`
    );
  } else {
    await sendTelegramMessage(chatId, "New event — send the <b>title</b>:");
  }
}

async function handleEventOneShot(user: AuthUser, chatId: string, text: string) {
  if (!hasPermission(user.role, "create_own_schedule")) {
    await sendTelegramMessage(chatId, "You don't have permission to create events.");
    return;
  }
  const parts = text.split("|").map((s) => s.trim());
  if (parts.length < 3) {
    await sendTelegramMessage(chatId, "Use: /event Title | start | end or duration");
    return;
  }
  const tz = await getAppTimezone();
  const [title, startStr, endStr] = parts;
  const startParsed = parseTelegramDateTime(startStr, tz);
  if (!startParsed.ok) {
    await sendTelegramMessage(chatId, startParsed.error);
    return;
  }
  const endParsed = parseEndOrDuration(startParsed.date, endStr, tz);
  if (!endParsed.ok) {
    await sendTelegramMessage(chatId, endParsed.error);
    return;
  }
  const { schedule, conflicts } = await createScheduleForUser(user, {
    title,
    startsAt: startParsed.date,
    endsAt: endParsed.end,
  });
  let msg = `✅ Event created: <b>${escapeHtml(schedule.title)}</b>`;
  if (conflicts.length) {
    msg += `\n⚠ ${conflicts.length} due-date conflict(s) during leave.`;
  }
  msg += `\n<a href="${calendarDeepLink()}">Open calendar</a>`;
  await sendTelegramMessage(chatId, msg);
}

export async function continueEventWizard(
  user: AuthUser,
  chatId: string,
  text: string
) {
  const session = await getSession(chatId);
  if (!session || session.flow !== "event") return false;

  const tz = await getAppTimezone();
  const payload = session.payload;

  if (session.step === "title") {
    await updateSessionPayload(chatId, "start", { title: text.trim() });
    await sendTelegramMessage(chatId, "Send <b>start</b> (e.g. tomorrow 10:00):");
    return true;
  }

  if (session.step === "start") {
    const parsed = parseTelegramDateTime(text, tz);
    if (!parsed.ok) {
      await sendTelegramMessage(chatId, parsed.error);
      return true;
    }
    await updateSessionPayload(chatId, "end", {
      startsAt: parsed.date.toISOString(),
    });
    await sendTelegramMessage(
      chatId,
      "Send <b>end</b> time or duration (e.g. 11:00 or 1h):"
    );
    return true;
  }

  if (session.step === "end") {
    const start = new Date(String(payload.startsAt));
    const endParsed = parseEndOrDuration(start, text, tz);
    if (!endParsed.ok) {
      await sendTelegramMessage(chatId, endParsed.error);
      return true;
    }
    await updateSessionPayload(chatId, "type", {
      endsAt: endParsed.end.toISOString(),
    });
    await sendTelegramMessage(chatId, "Pick <b>type</b>:", {
      replyMarkup: choiceKeyboard(
        "et",
        EVENT_TYPES.map((t) => ({ id: t, label: t }))
      ),
    });
    return true;
  }

  if (session.step === "assignee_text") {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.status, "active"))
      .orderBy(asc(users.name));
    const lower = text.trim().toLowerCase();
    const match = rows.find(
      (u) =>
        u.telegramUsername?.toLowerCase() === lower.replace("@", "") ||
        u.name.toLowerCase().includes(lower)
    );
    if (!match) {
      await sendTelegramMessage(chatId, "User not found.");
      return true;
    }
    await updateSessionPayload(chatId, "confirm", {
      userId: match.id,
      userName: match.name,
    });
    await sendEventConfirm(chatId, { ...payload, userName: match.name });
    return true;
  }

  return false;
}

async function sendEventConfirm(
  chatId: string,
  payload: Record<string, unknown>
) {
  const tz = await getAppTimezone();
  const start = formatTelegramDateTime(new Date(String(payload.startsAt)), tz);
  const end = formatTelegramDateTime(new Date(String(payload.endsAt)), tz);
  const lines = [
    "<b>Confirm event</b>",
    `Title: ${escapeHtml(String(payload.title))}`,
    `When: ${start} – ${end}`,
    `Type: ${payload.type || "work"}`,
  ];
  if (payload.userName) lines.push(`For: ${escapeHtml(String(payload.userName))}`);
  await sendTelegramMessage(chatId, lines.join("\n"), {
    replyMarkup: confirmKeyboard("ce"),
  });
}

export async function handleEventCallback(
  user: AuthUser,
  chatId: string,
  data: string
) {
  const session = await getSession(chatId);
  if (!session || session.flow !== "event") return;

  if (data.startsWith("et:")) {
    const type = data.slice(3);
    const payload = { ...session.payload, type };
    if (hasPermission(user.role, "manage_schedules")) {
      await upsertSession({
        userId: user.id,
        chatId,
        flow: "event",
        step: "assignee",
        payload,
      });
      await sendTelegramMessage(chatId, "Schedule for:", {
        replyMarkup: {
          inline_keyboard: [
            [{ text: "Me", callback_data: "eu:me" }],
            [{ text: "Someone else…", callback_data: "eu:other" }],
          ],
        },
      });
      return;
    }
    await upsertSession({
      userId: user.id,
      chatId,
      flow: "event",
      step: "confirm",
      payload: { ...payload, userId: user.id, userName: user.name },
    });
    await sendEventConfirm(chatId, { ...payload, userName: user.name });
    return;
  }

  if (data.startsWith("eu:")) {
    if (data === "eu:me") {
      await upsertSession({
        userId: user.id,
        chatId,
        flow: "event",
        step: "confirm",
        payload: {
          ...session.payload,
          userId: user.id,
          userName: user.name,
        },
      });
      await sendEventConfirm(chatId, { ...session.payload, userName: user.name });
      return;
    }
    await updateSessionPayload(chatId, "assignee_text", session.payload);
    await sendTelegramMessage(chatId, "Send @username or name:");
    return;
  }

  if (data.startsWith("ce:")) {
    if (data === "ce:no") {
      await clearSession(chatId);
      await sendTelegramMessage(chatId, "Cancelled.");
      return;
    }
    const p = session.payload;
    const targetUserId = (p.userId as string) || user.id;
    if (targetUserId !== user.id && !hasPermission(user.role, "manage_schedules")) {
      await sendTelegramMessage(chatId, "Cannot schedule for others.");
      return;
    }
    const { schedule, conflicts } = await createScheduleForUser(user, {
      title: String(p.title),
      startsAt: new Date(String(p.startsAt)),
      endsAt: new Date(String(p.endsAt)),
      type: (p.type as "work") || "work",
      userId: targetUserId,
    });
    await clearSession(chatId);
    let msg = `✅ Event created: <b>${escapeHtml(schedule.title)}</b>`;
    if (conflicts.length) msg += `\n⚠ ${conflicts.length} conflict(s).`;
    msg += `\n<a href="${calendarDeepLink()}">Open calendar</a>`;
    await sendTelegramMessage(chatId, msg);
  }
}
