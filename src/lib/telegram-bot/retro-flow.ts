import type { AuthUser } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";
import {
  createRetroItemForUser,
  queryActiveSprints,
  type RetroCategory,
} from "@/lib/create-retro-item";
import {
  clearSession,
  getSession,
  updateSessionPayload,
  upsertSession,
} from "@/lib/telegram-bot/sessions";
import { choiceKeyboard } from "@/lib/telegram-bot/keyboards";
import { escapeHtml } from "@/lib/telegram-bot/format";

const CATEGORIES: Array<{ id: RetroCategory; label: string }> = [
  { id: "went_well", label: "Went well" },
  { id: "went_wrong", label: "Went wrong" },
  { id: "action_item", label: "Action item" },
];

export async function handleRetroCommand(
  user: AuthUser,
  chatId: string,
  argsText: string
) {
  const trimmed = argsText.trim();
  if (trimmed.includes("|")) {
    const [cat, ...rest] = trimmed.split("|").map((s) => s.trim());
    const content = rest.join("|");
    const category = cat as RetroCategory;
    if (!CATEGORIES.some((c) => c.id === category) || !content) {
      await sendTelegramMessage(
        chatId,
        "Use: /retro went_well | Your note"
      );
      return;
    }
    const sprints = await queryActiveSprints();
    if (!sprints.length) {
      await sendTelegramMessage(chatId, "No active sprint found.");
      return;
    }
    await createRetroItemForUser(user, sprints[0].id, category, content);
    await sendTelegramMessage(chatId, "✅ Retro item added.");
    return;
  }

  const sprints = await queryActiveSprints();
  if (!sprints.length) {
    await sendTelegramMessage(chatId, "No active sprint found.");
    return;
  }
  if (sprints.length === 1) {
    await upsertSession({
      userId: user.id,
      chatId,
      flow: "retro",
      step: "category",
      payload: { sprintId: sprints[0].id },
    });
    await sendTelegramMessage(chatId, "Pick <b>category</b>:", {
      replyMarkup: choiceKeyboard(
        "rc",
        CATEGORIES.map((c) => ({ id: c.id, label: c.label }))
      ),
    });
    return;
  }

  await upsertSession({
    userId: user.id,
    chatId,
    flow: "retro",
    step: "sprint",
    payload: {},
  });
  await sendTelegramMessage(chatId, "Pick <b>sprint</b>:", {
    replyMarkup: choiceKeyboard(
      "rs",
      sprints.slice(0, 8).map((s) => ({ id: s.id, label: s.name }))
    ),
  });
}

export async function continueRetroWizard(
  user: AuthUser,
  chatId: string,
  text: string
) {
  const session = await getSession(chatId);
  if (!session || session.flow !== "retro") return false;
  if (session.step === "content") {
    const category = session.payload.category as RetroCategory;
    const sprintId = session.payload.sprintId as string;
    await createRetroItemForUser(user, sprintId, category, text.trim());
    await clearSession(chatId);
    await sendTelegramMessage(chatId, "✅ Retro item added.");
    return true;
  }
  return false;
}

export async function handleRetroCallback(
  user: AuthUser,
  chatId: string,
  data: string
) {
  const session = await getSession(chatId);
  if (!session || session.flow !== "retro") return;

  if (data.startsWith("rs:")) {
    await updateSessionPayload(chatId, "category", {
      sprintId: data.slice(3),
    });
    await sendTelegramMessage(chatId, "Pick <b>category</b>:", {
      replyMarkup: choiceKeyboard(
        "rc",
        CATEGORIES.map((c) => ({ id: c.id, label: c.label }))
      ),
    });
    return;
  }

  if (data.startsWith("rc:")) {
    await updateSessionPayload(chatId, "content", {
      category: data.slice(3),
    });
    await sendTelegramMessage(chatId, "Send your retro <b>note</b>:");
  }
}
