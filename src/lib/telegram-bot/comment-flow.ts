import type { AuthUser } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";
import { createCommentForUser } from "@/lib/create-comment";
import { resolveTaskRef } from "@/lib/query-tasks";
import { choiceKeyboard } from "@/lib/telegram-bot/keyboards";
import { truncate } from "@/lib/telegram-bot/format";

export async function handleCommentCommand(
  user: AuthUser,
  chatId: string,
  argsText: string
) {
  const pipe = argsText.indexOf("|");
  if (pipe === -1) {
    await sendTelegramMessage(chatId, "Use: /comment &lt;task&gt; | &lt;message&gt;");
    return;
  }
  const ref = argsText.slice(0, pipe).trim();
  const content = argsText.slice(pipe + 1).trim();
  if (!ref || !content) {
    await sendTelegramMessage(chatId, "Task ref and message required.");
    return;
  }

  const resolved = await resolveTaskRef(ref, user.id);
  if (resolved.ambiguous?.length) {
    await sendTelegramMessage(chatId, "Multiple tasks match:", {
      replyMarkup: choiceKeyboard(
        "cm",
        resolved.ambiguous.slice(0, 6).map((t) => ({
          id: t.id,
          label: truncate(t.title, 30),
        }))
      ),
    });
    await upsertCommentPending(chatId, user.id, content);
    return;
  }
  if (!resolved.task) {
    await sendTelegramMessage(chatId, "Task not found.");
    return;
  }

  await createCommentForUser(user, resolved.task.id, content);
  await sendTelegramMessage(chatId, "✅ Comment added.");
}

const pendingComments = new Map<string, string>();

function upsertCommentPending(chatId: string, _userId: string, content: string) {
  pendingComments.set(chatId, content);
}

export async function handleCommentPickCallback(
  user: AuthUser,
  chatId: string,
  taskId: string
) {
  const content = pendingComments.get(chatId);
  pendingComments.delete(chatId);
  if (!content) {
    const { handleCommentToTask } = await import("@/lib/telegram-bot/task-flow");
    await handleCommentToTask(user, chatId, taskId);
    return;
  }
  await createCommentForUser(user, taskId, content);
  await sendTelegramMessage(chatId, "✅ Comment added.");
}

export async function handleReplyComment(
  user: AuthUser,
  chatId: string,
  replyText: string,
  quotedText?: string
) {
  if (!replyText.trim()) return;
  const idMatch = quotedText?.match(/task[_-]([0-9a-f-]{8,})/i);
  if (idMatch) {
    await createCommentForUser(user, idMatch[1], replyText.trim());
    await sendTelegramMessage(chatId, "✅ Comment added.");
    return;
  }
  await sendTelegramMessage(
    chatId,
    "Could not detect task from reply. Use /comment &lt;task&gt; | &lt;message&gt;"
  );
}
