import type { AuthUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasPermission } from "@/lib/permissions";
import { sendTelegramMessage } from "@/lib/telegram";
import { createScheduleForUser } from "@/lib/create-schedule";
import { createTaskForUser } from "@/lib/create-task";
import { getAppTimezone } from "@/lib/timezone-server";
import { formatTelegramDateTime } from "@/lib/telegram-dates";
import {
  interpretTelegramText,
  isInterpretConfigured,
} from "@/lib/telegram-interpret/ollama";
import type {
  InterpretTurn,
  TelegramIntent,
  TelegramInterpretResult,
} from "@/lib/telegram-interpret/schema";
import {
  getMissingFields,
  isListIntent,
  isMutationIntent,
  questionForField,
} from "@/lib/telegram-interpret/required";
import {
  clearSession,
  getSession,
  upsertSession,
} from "@/lib/telegram-bot/sessions";
import {
  listActiveProjects,
  resolveProjectByName,
} from "@/lib/telegram-bot/projects";
import { resolveUsersByTelegramRef } from "@/lib/query-tasks";
import { choiceKeyboard, confirmKeyboard } from "@/lib/telegram-bot/keyboards";
import { escapeHtml } from "@/lib/telegram-bot/format";
import {
  calendarDeepLink,
  taskDeepLink,
} from "@/lib/telegram-bot/auth";
import { handleListTasks } from "@/lib/telegram-bot/list-tasks";
import { handleListCalendar } from "@/lib/telegram-bot/list-calendar";

const MAX_CLARIFY_TURNS = 5;

type NlPayload = {
  draft: TelegramInterpretResult;
  turns: InterpretTurn[];
  clarifyCount: number;
  originalText: string;
  projectId?: string;
  assigneeId?: string;
};

function asNlPayload(payload: Record<string, unknown>): NlPayload | null {
  const draft = payload.draft as TelegramInterpretResult | undefined;
  if (!draft || typeof draft !== "object") return null;
  return {
    draft,
    turns: Array.isArray(payload.turns)
      ? (payload.turns as InterpretTurn[])
      : [],
    clarifyCount:
      typeof payload.clarifyCount === "number" ? payload.clarifyCount : 0,
    originalText:
      typeof payload.originalText === "string"
        ? payload.originalText
        : draft.raw || "",
    projectId:
      typeof payload.projectId === "string" ? payload.projectId : undefined,
    assigneeId:
      typeof payload.assigneeId === "string" ? payload.assigneeId : undefined,
  };
}

async function askMissing(
  user: AuthUser,
  chatId: string,
  draft: TelegramInterpretResult,
  missing: string[],
  turns: InterpretTurn[],
  clarifyCount: number,
  originalText: string,
  projectId?: string,
  assigneeId?: string
) {
  const field = missing[0];
  const question = questionForField(field, draft);

  await upsertSession({
    userId: user.id,
    chatId,
    flow: "nl",
    step: "clarify",
    payload: {
      draft,
      turns,
      clarifyCount,
      originalText,
      pendingField: field,
      projectId,
      assigneeId,
    },
  });

  if (field === "projectName") {
    const projects = await listActiveProjects();
    if (projects.length > 0 && projects.length <= 12) {
      await sendTelegramMessage(chatId, escapeHtml(question), {
        replyMarkup: choiceKeyboard(
          "np",
          projects.map((p) => ({ id: p.id, label: p.name }))
        ),
      });
      return;
    }
  }

  await sendTelegramMessage(chatId, escapeHtml(question));
}

async function showConfirm(
  user: AuthUser,
  chatId: string,
  draft: TelegramInterpretResult,
  originalText: string,
  projectId?: string,
  assigneeId?: string,
  assigneeName?: string
) {
  const tz = await getAppTimezone();
  const lines = ["<b>Confirm</b>"];
  const forName = assigneeName || user.name;

  if (draft.intent === "create_event" || draft.intent === "create_leave") {
    const title =
      draft.title?.trim() ||
      (draft.intent === "create_leave" ? "Leave" : "Event");
    lines.push(`Type: ${draft.intent === "create_leave" ? "leave" : "event"}`);
    lines.push(`Title: ${escapeHtml(title)}`);
    if (forName) lines.push(`For: ${escapeHtml(forName)}`);
    if (draft.startsAt) {
      lines.push(
        `Start: ${formatTelegramDateTime(new Date(draft.startsAt), tz)}`
      );
    }
    if (draft.endsAt) {
      lines.push(`End: ${formatTelegramDateTime(new Date(draft.endsAt), tz)}`);
    }
    if (draft.scheduleType) lines.push(`Category: ${draft.scheduleType}`);
  } else if (draft.intent === "create_task") {
    lines.push(`Task: ${escapeHtml(draft.title || "")}`);
    lines.push(`Project: ${escapeHtml(draft.projectName || "")}`);
    if (forName) lines.push(`Assignee: ${escapeHtml(forName)}`);
    if (draft.priority) lines.push(`Priority: ${draft.priority}`);
    if (draft.dueDate) {
      lines.push(
        `Due: ${formatTelegramDateTime(new Date(draft.dueDate), tz)}`
      );
    }
  }

  await upsertSession({
    userId: user.id,
    chatId,
    flow: "nl",
    step: "confirm",
    payload: {
      draft,
      turns: [],
      clarifyCount: 0,
      originalText,
      projectId,
      assigneeId,
    },
  });

  await sendTelegramMessage(chatId, lines.join("\n"), {
    replyMarkup: confirmKeyboard("nl"),
  });
}

async function resolveTaskProject(
  draft: TelegramInterpretResult
): Promise<
  | { ok: true; projectId: string; projectName: string }
  | { ok: false; missing: true; ambiguous?: Array<{ id: string; name: string }> }
> {
  if (!draft.projectName?.trim()) {
    return { ok: false, missing: true };
  }
  const match = await resolveProjectByName(draft.projectName);
  if (match.project) {
    return {
      ok: true,
      projectId: match.project.id,
      projectName: match.project.name,
    };
  }
  if (match.ambiguous) {
    return { ok: false, missing: true, ambiguous: match.ambiguous };
  }
  return { ok: false, missing: true };
}

async function resolveAssignee(
  draft: TelegramInterpretResult
): Promise<
  | { ok: true; assigneeId: string; assigneeName: string }
  | {
      ok: false;
      missing: true;
      ambiguous?: Array<{ id: string; name: string }>;
    }
  | { ok: true; assigneeId: undefined; assigneeName: undefined }
> {
  if (!draft.assigneeName?.trim()) {
    return { ok: true, assigneeId: undefined, assigneeName: undefined };
  }
  const matches = await resolveUsersByTelegramRef(draft.assigneeName);
  if (matches.length === 1) {
    return {
      ok: true,
      assigneeId: matches[0].id,
      assigneeName: matches[0].name,
    };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      missing: true,
      ambiguous: matches.map((u) => ({ id: u.id, name: u.name })),
    };
  }
  return { ok: false, missing: true };
}

async function processResult(
  user: AuthUser,
  chatId: string,
  result: TelegramInterpretResult,
  originalText: string,
  turns: InterpretTurn[],
  clarifyCount: number,
  preferredIntent?: TelegramIntent
) {
  if (result.confidence < 0.5 && result.intent !== "unknown") {
    result = { ...result, intent: "unknown" };
  }

  if (result.intent === "unknown") {
    await clearSession(chatId);
    await sendTelegramMessage(
      chatId,
      "I didn't understand that. Try again in plain language, or send /help."
    );
    return;
  }

  if (
    result.intent === "standup" ||
    result.intent === "comment" ||
    result.intent === "status"
  ) {
    await clearSession(chatId);
    await sendTelegramMessage(
      chatId,
      `For that, use /${result.intent === "status" ? "status" : result.intent} for now.`
    );
    return;
  }

  if (isListIntent(result.intent)) {
    await clearSession(chatId);
    const range = result.listRange || "today";
    if (result.intent === "list_tasks") {
      await handleListTasks(user, chatId, [range]);
    } else {
      await handleListCalendar(user, chatId, [range]);
    }
    return;
  }

  if (!isMutationIntent(result.intent)) {
    await clearSession(chatId);
    await sendTelegramMessage(chatId, "Send /help for what I can do.");
    return;
  }

  // Permissions early
  if (
    (result.intent === "create_event" || result.intent === "create_leave") &&
    !hasPermission(user.role, "create_own_schedule")
  ) {
    await sendTelegramMessage(chatId, "You don't have permission to create schedules.");
    return;
  }
  if (
    result.intent === "create_task" &&
    !hasPermission(user.role, "create_tasks")
  ) {
    await sendTelegramMessage(chatId, "You don't have permission to create tasks.");
    return;
  }

  let projectId: string | undefined;
  if (result.intent === "create_task") {
    const resolved = await resolveTaskProject(result);
    if (!resolved.ok) {
      if (resolved.ambiguous?.length) {
        await upsertSession({
          userId: user.id,
          chatId,
          flow: "nl",
          step: "clarify",
          payload: {
            draft: result,
            turns,
            clarifyCount,
            originalText,
            pendingField: "projectName",
          },
        });
        await sendTelegramMessage(chatId, "Multiple projects match. Pick one:", {
          replyMarkup: choiceKeyboard(
            "np",
            resolved.ambiguous.slice(0, 12).map((p) => ({
              id: p.id,
              label: p.name,
            }))
          ),
        });
        return;
      }
      result = {
        ...result,
        projectName: null,
        needsClarification: true,
        missingFields: ["projectName"],
      };
    } else {
      projectId = resolved.projectId;
      result = { ...result, projectName: resolved.projectName };
    }
  }

  let assigneeId: string | undefined;
  let assigneeName: string | undefined;
  if (
    result.intent === "create_event" ||
    result.intent === "create_leave" ||
    result.intent === "create_task"
  ) {
    const resolved = await resolveAssignee(result);
    if (!resolved.ok) {
      if (resolved.ambiguous?.length) {
        await upsertSession({
          userId: user.id,
          chatId,
          flow: "nl",
          step: "clarify",
          payload: {
            draft: result,
            turns,
            clarifyCount,
            originalText,
            pendingField: "assigneeName",
            projectId,
          },
        });
        await sendTelegramMessage(chatId, "Multiple people match. Pick one:", {
          replyMarkup: choiceKeyboard(
            "nu",
            resolved.ambiguous.slice(0, 12).map((u) => ({
              id: u.id,
              label: u.name,
            }))
          ),
        });
        return;
      }
      result = {
        ...result,
        assigneeName: null,
        needsClarification: true,
        missingFields: [
          ...new Set([...(result.missingFields || []), "assigneeName"]),
        ],
      };
    } else if (resolved.assigneeId) {
      const schedulingOther = resolved.assigneeId !== user.id;
      if (
        schedulingOther &&
        (result.intent === "create_event" || result.intent === "create_leave") &&
        !hasPermission(user.role, "manage_schedules")
      ) {
        await sendTelegramMessage(
          chatId,
          "You don't have permission to schedule for others."
        );
        return;
      }
      if (
        schedulingOther &&
        result.intent === "create_task" &&
        !hasPermission(user.role, "assign_tasks")
      ) {
        await sendTelegramMessage(
          chatId,
          "You don't have permission to assign tasks to others."
        );
        return;
      }
      assigneeId = resolved.assigneeId;
      assigneeName = resolved.assigneeName;
      result = { ...result, assigneeName: resolved.assigneeName };
    }
  }

  if (result.intent === "create_leave" && !result.title?.trim()) {
    result = { ...result, title: "Leave", scheduleType: "leave", allDay: true };
  }

  const missing = getMissingFields(result);
  if (
    result.missingFields.includes("assigneeName") &&
    !missing.includes("assigneeName")
  ) {
    missing.push("assigneeName");
  }

  if (missing.length) {
    if (clarifyCount >= MAX_CLARIFY_TURNS) {
      await clearSession(chatId);
      await sendTelegramMessage(
        chatId,
        "Still missing details after several tries. Use /event Title | start | end or /task Project | Title, or /cancel."
      );
      return;
    }
    await askMissing(
      user,
      chatId,
      result,
      missing,
      turns,
      clarifyCount,
      originalText,
      projectId,
      assigneeId
    );
    return;
  }

  void preferredIntent;
  await showConfirm(
    user,
    chatId,
    result,
    originalText,
    projectId,
    assigneeId,
    assigneeName
  );
}

export async function handleNaturalLanguage(
  user: AuthUser,
  chatId: string,
  text: string,
  preferredIntent?: TelegramIntent
) {
  if (text.trim().length < 3) {
    await sendTelegramMessage(chatId, "Say a bit more, or send /help.");
    return;
  }

  if (!isInterpretConfigured()) {
    await sendTelegramMessage(
      chatId,
      "Natural language isn't configured. Use /event, /task, or /help."
    );
    return;
  }

  await sendTelegramMessage(chatId, "Parsing…");

  const interpreted = await interpretTelegramText(text, { preferredIntent });
  if (!interpreted.ok) {
    await sendTelegramMessage(
      chatId,
      `Couldn't reach the language model (${escapeHtml(interpreted.error)}). Try /event or /task, or try again later.`
    );
    return;
  }

  await processResult(
    user,
    chatId,
    interpreted.result,
    text,
    [],
    0,
    preferredIntent
  );
}

export async function continueNlClarify(
  user: AuthUser,
  chatId: string,
  text: string
): Promise<boolean> {
  const session = await getSession(chatId);
  if (!session || session.flow !== "nl" || session.step !== "clarify") {
    return false;
  }

  const nl = asNlPayload(session.payload);
  if (!nl) return false;

  if (nl.clarifyCount >= MAX_CLARIFY_TURNS) {
    await clearSession(chatId);
    await sendTelegramMessage(
      chatId,
      "Still missing details. Use /event Title | start | end or /task Project | Title."
    );
    return true;
  }

  const pendingField =
    typeof session.payload.pendingField === "string"
      ? session.payload.pendingField
      : getMissingFields(nl.draft)[0] || "details";
  const question = questionForField(pendingField, nl.draft);
  const turns: InterpretTurn[] = [
    ...nl.turns,
    { q: question, a: text.trim() },
  ];

  await sendTelegramMessage(chatId, "Parsing…");

  const interpreted = await interpretTelegramText(nl.originalText, {
    draft: nl.draft,
    turns,
  });

  if (!interpreted.ok) {
    await sendTelegramMessage(
      chatId,
      `Couldn't reach the language model. Try again or /cancel.`
    );
    return true;
  }

  await processResult(
    user,
    chatId,
    interpreted.result,
    nl.originalText,
    turns,
    nl.clarifyCount + 1
  );
  return true;
}

export async function handleNlCallback(
  user: AuthUser,
  chatId: string,
  data: string
) {
  if (data.startsWith("np:")) {
    const projectId = data.slice(3);
    const session = await getSession(chatId);
    if (!session || session.flow !== "nl") return;
    const nl = asNlPayload(session.payload);
    if (!nl) return;

    const projects = await listActiveProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      await sendTelegramMessage(chatId, "Project not found.");
      return;
    }

    const draft: TelegramInterpretResult = {
      ...nl.draft,
      intent: "create_task",
      projectName: project.name,
    };

    await processResult(
      user,
      chatId,
      draft,
      nl.originalText,
      nl.turns,
      nl.clarifyCount
    );
    return;
  }

  if (data.startsWith("nu:")) {
    const assigneeId = data.slice(3);
    const session = await getSession(chatId);
    if (!session || session.flow !== "nl") return;
    const nl = asNlPayload(session.payload);
    if (!nl) return;

    const [pickedUser] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, assigneeId))
      .limit(1);

    if (!pickedUser) {
      await sendTelegramMessage(chatId, "User not found.");
      return;
    }

    const draft: TelegramInterpretResult = {
      ...nl.draft,
      assigneeName: pickedUser.name,
    };

    await processResult(
      user,
      chatId,
      draft,
      nl.originalText,
      nl.turns,
      nl.clarifyCount
    );
    return;
  }

  if (!data.startsWith("nl:")) return;

  const session = await getSession(chatId);
  if (!session || session.flow !== "nl" || session.step !== "confirm") {
    await sendTelegramMessage(chatId, "Nothing to confirm. Send a new message.");
    return;
  }

  const nl = asNlPayload(session.payload);
  if (!nl) {
    await clearSession(chatId);
    return;
  }

  if (data === "nl:no") {
    await clearSession(chatId);
    await sendTelegramMessage(chatId, "Cancelled.");
    return;
  }

  if (data !== "nl:yes") return;

  const draft = nl.draft;
  const targetUserId = nl.assigneeId || user.id;

  try {
    if (draft.intent === "create_event" || draft.intent === "create_leave") {
      if (!hasPermission(user.role, "create_own_schedule")) {
        await sendTelegramMessage(chatId, "Forbidden.");
        await clearSession(chatId);
        return;
      }
      if (
        targetUserId !== user.id &&
        !hasPermission(user.role, "manage_schedules")
      ) {
        await sendTelegramMessage(chatId, "Cannot schedule for others.");
        await clearSession(chatId);
        return;
      }
      const title =
        draft.title?.trim() ||
        (draft.intent === "create_leave" ? "Leave" : "Event");
      const { schedule, conflicts } = await createScheduleForUser(user, {
        title,
        description: draft.description,
        startsAt: new Date(draft.startsAt!),
        endsAt: new Date(draft.endsAt!),
        allDay:
          draft.intent === "create_leave" ? true : Boolean(draft.allDay),
        type:
          draft.intent === "create_leave"
            ? "leave"
            : draft.scheduleType || "work",
        userId: targetUserId,
      });
      await clearSession(chatId);
      let msg = `✅ Created: <b>${escapeHtml(schedule.title)}</b>`;
      if (schedule.userName) {
        msg += `\nFor: ${escapeHtml(schedule.userName)}`;
      }
      if (conflicts.length) {
        msg += `\n⚠ ${conflicts.length} due-date conflict(s).`;
      }
      msg += `\n<a href="${calendarDeepLink()}">Open calendar</a>`;
      await sendTelegramMessage(chatId, msg);
      return;
    }

    if (draft.intent === "create_task") {
      if (!hasPermission(user.role, "create_tasks")) {
        await sendTelegramMessage(chatId, "Forbidden.");
        await clearSession(chatId);
        return;
      }
      if (
        targetUserId !== user.id &&
        !hasPermission(user.role, "assign_tasks")
      ) {
        await sendTelegramMessage(chatId, "Cannot assign tasks to others.");
        await clearSession(chatId);
        return;
      }
      let projectId = nl.projectId;
      if (!projectId && draft.projectName) {
        const match = await resolveProjectByName(draft.projectName);
        projectId = match.project?.id;
      }
      if (!projectId) {
        await sendTelegramMessage(chatId, "Project missing. Start over.");
        await clearSession(chatId);
        return;
      }
      const task = await createTaskForUser(user, {
        title: draft.title!.trim(),
        description: draft.description,
        projectId,
        priority: draft.priority || "medium",
        dueDate: draft.dueDate ? new Date(draft.dueDate) : null,
        status: draft.status || "todo",
        assigneeId: targetUserId,
      });
      await clearSession(chatId);
      await sendTelegramMessage(
        chatId,
        `✅ Task created: <b>${escapeHtml(task.title)}</b>\nAssignee: ${escapeHtml(draft.assigneeName || user.name || "—")}\n<a href="${taskDeepLink(task.projectId)}">Open project</a>`
      );
      return;
    }
  } catch (err) {
    console.error("[telegram-bot] nl confirm failed:", err);
    await sendTelegramMessage(chatId, "Failed to create. Try again.");
  }

  await clearSession(chatId);
}
