import type { AuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { sendTelegramMessage } from "@/lib/telegram";
import { createTaskForUser } from "@/lib/create-task";
import { getTaskById, resolveTaskRef } from "@/lib/query-tasks";
import { queryCommentsForTask } from "@/lib/create-comment";
import { getAppTimezone } from "@/lib/timezone-server";
import { formatTelegramDateTime } from "@/lib/telegram-dates";
import {
  clearSession,
  getSession,
  updateSessionPayload,
  upsertSession,
} from "@/lib/telegram-bot/sessions";
import { listActiveProjects, resolveProjectByName } from "@/lib/telegram-bot/projects";
import { choiceKeyboard, confirmKeyboard } from "@/lib/telegram-bot/keyboards";
import { escapeHtml, truncate } from "@/lib/telegram-bot/format";
import { taskDeepLink } from "@/lib/telegram-bot/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function handleTaskCommand(
  user: AuthUser,
  chatId: string,
  argsText: string
) {
  const trimmed = argsText.trim();

  if (trimmed.toLowerCase().endsWith(" comments")) {
    const ref = trimmed.slice(0, -" comments".length).trim();
    return handleTaskComments(user, chatId, ref);
  }

  if (trimmed && trimmed.includes("|")) {
    return handleTaskOneShot(user, chatId, trimmed);
  }

  if (trimmed && !trimmed.includes("|")) {
    const resolved = await resolveTaskRef(trimmed, user.id);
    if (resolved.task) {
      return showTaskDetail(user, chatId, resolved.task);
    }
    if (resolved.ambiguous?.length) {
      await sendTelegramMessage(chatId, "Multiple tasks match. Pick one:", {
        replyMarkup: choiceKeyboard(
          "td",
          resolved.ambiguous.slice(0, 8).map((t) => ({
            id: t.id,
            label: truncate(t.title, 35),
          }))
        ),
      });
      return;
    }
    await upsertSession({
      userId: user.id,
      chatId,
      flow: "task",
      step: "project",
      payload: { title: trimmed },
    });
    await promptProject(chatId);
    return;
  }

  await upsertSession({
    userId: user.id,
    chatId,
    flow: "task",
    step: "title",
    payload: {},
  });
  await sendTelegramMessage(chatId, "New task — send the <b>title</b>:");
}

async function handleTaskOneShot(user: AuthUser, chatId: string, text: string) {
  if (!hasPermission(user.role, "create_tasks")) {
    await sendTelegramMessage(chatId, "You don't have permission to create tasks.");
    return;
  }
  const [projectPart, ...titleParts] = text.split("|").map((s) => s.trim());
  const title = titleParts.join("|").trim();
  if (!projectPart || !title) {
    await sendTelegramMessage(chatId, "Use: /task Project Name | Task title");
    return;
  }
  const match = await resolveProjectByName(projectPart);
  if (match.ambiguous) {
    await sendTelegramMessage(chatId, "Multiple projects match. Use /task wizard instead.");
    return;
  }
  if (!match.project) {
    await sendTelegramMessage(chatId, `Project not found: ${escapeHtml(projectPart)}`);
    return;
  }
  const task = await createTaskForUser(user, {
    title,
    projectId: match.project.id,
  });
  await sendTelegramMessage(
    chatId,
    `✅ Task created: <b>${escapeHtml(task.title)}</b>\n<a href="${taskDeepLink(task.projectId)}">Open project</a>`
  );
}

async function promptProject(chatId: string) {
  const projects = await listActiveProjects();
  if (!projects.length) {
    await sendTelegramMessage(chatId, "No active projects. Create one in Perfect first.");
    return;
  }
  await sendTelegramMessage(chatId, "Pick a <b>project</b>:", {
    replyMarkup: choiceKeyboard(
      "pj",
      projects.slice(0, 12).map((p) => ({ id: p.id, label: p.name }))
    ),
  });
}

export async function continueTaskWizard(
  user: AuthUser,
  chatId: string,
  text: string
) {
  const session = await getSession(chatId);
  if (!session || session.flow !== "task") return false;

  if (session.step === "title") {
    await updateSessionPayload(chatId, "project", { title: text.trim() });
    await promptProject(chatId);
    return true;
  }

  if (session.step === "assignee_text") {
    const target = await db
      .select()
      .from(users)
      .where(eq(users.status, "active"))
      .orderBy(asc(users.name));
    const lower = text.trim().toLowerCase();
    const match = target.find(
      (u) =>
        u.telegramUsername?.toLowerCase() === lower.replace("@", "") ||
        u.name.toLowerCase().includes(lower)
    );
    if (!match) {
      await sendTelegramMessage(chatId, "User not found. Send @username or name:");
      return true;
    }
    await updateSessionPayload(chatId, "confirm", {
      assigneeId: match.id,
      assigneeName: match.name,
    });
    await sendConfirm(chatId, session.payload, match.name);
    return true;
  }

  return false;
}

async function sendConfirm(
  chatId: string,
  payload: Record<string, unknown>,
  assigneeName?: string
) {
  const lines = [
    `<b>Confirm task</b>`,
    `Title: ${escapeHtml(String(payload.title || ""))}`,
    `Project: ${escapeHtml(String(payload.projectName || ""))}`,
  ];
  if (assigneeName) lines.push(`Assignee: ${escapeHtml(assigneeName)}`);
  await sendTelegramMessage(chatId, lines.join("\n"), {
    replyMarkup: confirmKeyboard("ct"),
  });
}

export async function handleTaskCallback(
  user: AuthUser,
  chatId: string,
  data: string
) {
  if (data.startsWith("pj:")) {
    const projectId = data.slice(3);
    const projects = await listActiveProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const session = await getSession(chatId);
    if (!session) return;
    const payload: Record<string, unknown> = {
      ...session.payload,
      projectId,
      projectName: project.name,
    };
    if (hasPermission(user.role, "assign_tasks") && !payload.assigneeId) {
      await upsertSession({
        userId: user.id,
        chatId,
        flow: "task",
        step: "assignee",
        payload,
      });
      await sendTelegramMessage(chatId, "Assign to yourself or pick another user:", {
        replyMarkup: {
          inline_keyboard: [
            [{ text: "Me", callback_data: "ua:me" }],
            [{ text: "Someone else…", callback_data: "ua:other" }],
          ],
        },
      });
      return;
    }
    await upsertSession({
      userId: user.id,
      chatId,
      flow: "task",
      step: "confirm",
      payload: { ...payload, assigneeId: user.id, assigneeName: user.name },
    });
    await sendConfirm(chatId, payload, user.name);
    return;
  }

  if (data.startsWith("ua:")) {
    const session = await getSession(chatId);
    if (!session) return;
    if (data === "ua:me") {
      await upsertSession({
        userId: user.id,
        chatId,
        flow: "task",
        step: "confirm",
        payload: {
          ...session.payload,
          assigneeId: user.id,
          assigneeName: user.name,
        },
      });
      await sendConfirm(chatId, session.payload, user.name);
      return;
    }
    await updateSessionPayload(chatId, "assignee_text", session.payload);
    await sendTelegramMessage(chatId, "Send @username or name for assignee:");
    return;
  }

  if (data.startsWith("ct:")) {
    const session = await getSession(chatId);
    if (!session) return;
    if (data === "ct:no") {
      await clearSession(chatId);
      await sendTelegramMessage(chatId, "Cancelled.");
      return;
    }
    if (!hasPermission(user.role, "create_tasks")) {
      await sendTelegramMessage(chatId, "Forbidden.");
      return;
    }
    const p = session.payload;
    const assigneeId = (p.assigneeId as string) || user.id;
    if (assigneeId !== user.id && !hasPermission(user.role, "assign_tasks")) {
      await sendTelegramMessage(chatId, "Cannot assign to others.");
      return;
    }
    const task = await createTaskForUser(user, {
      title: String(p.title),
      projectId: String(p.projectId),
      assigneeId,
    });
    await clearSession(chatId);
    await sendTelegramMessage(
      chatId,
      `✅ Task created: <b>${escapeHtml(task.title)}</b>\n<a href="${taskDeepLink(task.projectId)}">Open project</a>`
    );
    return;
  }

  if (data.startsWith("td:")) {
    const task = await getTaskById(data.slice(3));
    if (task) await showTaskDetail(user, chatId, task);
  }
}

async function showTaskDetail(
  user: AuthUser,
  chatId: string,
  task: NonNullable<Awaited<ReturnType<typeof getTaskById>>>
) {
  const tz = await getAppTimezone();
  const due = task.dueDate
    ? formatTelegramDateTime(task.dueDate, tz)
    : "none";
  const text = [
    `<b>${escapeHtml(task.title)}</b>`,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
    `Due: ${due}`,
    `Project: ${escapeHtml(task.projectName || "—")}`,
    `Assignee: ${escapeHtml(task.assigneeName || "—")}`,
    task.description
      ? `\n${escapeHtml(truncate(task.description, 200))}`
      : "",
    `\n<a href="${taskDeepLink(task.projectId)}">Open in Perfect</a>`,
  ].join("\n");
  await sendTelegramMessage(chatId, text);
}

async function handleTaskComments(user: AuthUser, chatId: string, ref: string) {
  const resolved = await resolveTaskRef(ref, user.id);
  if (!resolved.task) {
    await sendTelegramMessage(chatId, "Task not found.");
    return;
  }
  const comments = await queryCommentsForTask(resolved.task.id, 5);
  if (!comments.length) {
    await sendTelegramMessage(chatId, "No comments on this task.");
    return;
  }
  const lines = comments.map(
    (c) => `• ${escapeHtml(c.authorName || "?")}: ${escapeHtml(truncate(c.content, 80))}`
  );
  await sendTelegramMessage(
    chatId,
    `<b>Comments — ${escapeHtml(resolved.task.title)}</b>\n${lines.join("\n")}`
  );
}

export async function handleCommentToTask(
  user: AuthUser,
  chatId: string,
  taskId: string
) {
  await upsertSession({
    userId: user.id,
    chatId,
    flow: "task",
    step: "comment",
    payload: { commentTaskId: taskId },
  });
  await sendTelegramMessage(chatId, "Send your comment:");
}

export async function handleCommentSessionText(
  user: AuthUser,
  chatId: string,
  text: string
) {
  const session = await getSession(chatId);
  if (!session || session.step !== "comment") return false;
  const taskId = session.payload.commentTaskId as string;
  const { createCommentForUser } = await import("@/lib/create-comment");
  await createCommentForUser(user, taskId, text.trim());
  await clearSession(chatId);
  await sendTelegramMessage(chatId, "✅ Comment added.");
  return true;
}
