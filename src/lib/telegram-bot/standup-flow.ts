import type { AuthUser } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";
import { upsertStandupForUser } from "@/lib/upsert-standup";
import { queryActiveSprints } from "@/lib/create-retro-item";
import {
  clearSession,
  getSession,
  updateSessionPayload,
  upsertSession,
} from "@/lib/telegram-bot/sessions";
import { confirmKeyboard } from "@/lib/telegram-bot/keyboards";
import { escapeHtml } from "@/lib/telegram-bot/format";

export async function handleStandupCommand(
  user: AuthUser,
  chatId: string,
  argsText: string
) {
  const trimmed = argsText.trim();
  if (trimmed.toLowerCase().startsWith("today") && trimmed.includes("|")) {
    const content = trimmed.split("|").slice(1).join("|").trim();
    await upsertStandupForUser(user, { today: content });
    await sendTelegramMessage(chatId, "✅ Standup updated (today).");
    return;
  }

  const sprints = await queryActiveSprints();
  let sprintId: string | null = null;
  if (sprints.length === 1) sprintId = sprints[0].id;

  await upsertSession({
    userId: user.id,
    chatId,
    flow: "standup",
    step: "yesterday",
    payload: sprintId ? { sprintId } : {},
  });
  await sendTelegramMessage(chatId, "Standup — what did you do <b>yesterday</b>?");
}

export async function continueStandupWizard(
  user: AuthUser,
  chatId: string,
  text: string
) {
  const session = await getSession(chatId);
  if (!session || session.flow !== "standup") return false;

  if (session.step === "yesterday") {
    await updateSessionPayload(chatId, "today", { yesterday: text.trim() });
    await sendTelegramMessage(chatId, "What will you do <b>today</b>?");
    return true;
  }
  if (session.step === "today") {
    await updateSessionPayload(chatId, "blockers", { today: text.trim() });
    await sendTelegramMessage(chatId, "Any <b>blockers</b>? (send — if none)");
    return true;
  }
  if (session.step === "blockers") {
    await updateSessionPayload(chatId, "confirm", { blockers: text.trim() });
    const p = { ...session.payload, blockers: text.trim() } as Record<string, unknown>;
    await sendTelegramMessage(
      chatId,
      [
        "<b>Confirm standup</b>",
        `Yesterday: ${escapeHtml(String(p.yesterday || "—"))}`,
        `Today: ${escapeHtml(String(p.today || "—"))}`,
        `Blockers: ${escapeHtml(String(p.blockers || "—"))}`,
      ].join("\n"),
      { replyMarkup: confirmKeyboard("su") }
    );
    return true;
  }
  return false;
}

export async function handleStandupCallback(
  user: AuthUser,
  chatId: string,
  data: string
) {
  if (!data.startsWith("su:")) return;
  const session = await getSession(chatId);
  if (!session) return;
  if (data === "su:no") {
    await clearSession(chatId);
    await sendTelegramMessage(chatId, "Cancelled.");
    return;
  }
  const p = session.payload;
  await upsertStandupForUser(user, {
    sprintId: (p.sprintId as string) || null,
    yesterday: (p.yesterday as string) || null,
    today: (p.today as string) || null,
    blockers: (p.blockers as string) || null,
  });
  await clearSession(chatId);
  await sendTelegramMessage(chatId, "✅ Standup saved.");
}
