import type { AuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { sendTelegramMessage } from "@/lib/telegram";
import { updateTaskForUser } from "@/lib/update-task";
import { resolveTaskRef } from "@/lib/query-tasks";
import { choiceKeyboard } from "@/lib/telegram-bot/keyboards";
import { escapeHtml, truncate } from "@/lib/telegram-bot/format";

const VALID_STATUSES = ["todo", "in_progress", "review", "done"] as const;

export async function handleDoneCommand(
  user: AuthUser,
  chatId: string,
  ref: string
) {
  return handleStatusCommand(user, chatId, ref, "done");
}

export async function handleStatusCommand(
  user: AuthUser,
  chatId: string,
  ref: string,
  status?: string
) {
  if (!hasPermission(user.role, "edit_tasks")) {
    await sendTelegramMessage(chatId, "You don't have permission to edit tasks.");
    return;
  }

  const parts = ref.trim().split(/\s+/);
  const taskRef = parts[0];
  const statusArg = status || parts[1];

  if (!taskRef) {
    await sendTelegramMessage(chatId, "Use: /done &lt;task&gt; or /status &lt;task&gt; &lt;status&gt;");
    return;
  }

  if (!statusArg || !VALID_STATUSES.includes(statusArg as typeof VALID_STATUSES[number])) {
    await sendTelegramMessage(chatId, `Status must be one of: ${VALID_STATUSES.join(", ")}`);
    return;
  }

  const resolved = await resolveTaskRef(taskRef, user.id);
  if (resolved.ambiguous?.length) {
    await sendTelegramMessage(chatId, "Multiple tasks match:", {
      replyMarkup: choiceKeyboard(
        "st",
        resolved.ambiguous.slice(0, 6).map((t) => ({
          id: `${t.id}:${statusArg}`,
          label: truncate(t.title, 30),
        }))
      ),
    });
    return;
  }
  if (!resolved.task) {
    await sendTelegramMessage(chatId, "Task not found.");
    return;
  }

  await applyStatus(user, chatId, resolved.task.id, statusArg, resolved.task.title);
}

export async function applyStatus(
  user: AuthUser,
  chatId: string,
  taskId: string,
  status: string,
  title?: string
) {
  const task = await updateTaskForUser(user, taskId, {
    status: status as "done",
  });
  if (!task) {
    await sendTelegramMessage(chatId, "Task not found.");
    return;
  }
  await sendTelegramMessage(
    chatId,
    `✅ <b>${escapeHtml(title || task.title)}</b> → ${status}`
  );
}

export async function handleStatusCallback(
  user: AuthUser,
  chatId: string,
  data: string
) {
  const body = data.startsWith("st:") ? data.slice(3) : data;
  const [taskId, status] = body.split(":");
  if (!taskId || !status) return;
  await applyStatus(user, chatId, taskId, status);
}
