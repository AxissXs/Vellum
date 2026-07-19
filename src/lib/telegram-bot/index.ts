import type { AuthUser } from "@/lib/auth";
import {
  answerCallbackQuery,
  sendTelegramMessage,
} from "@/lib/telegram";
import { getAppTimezone } from "@/lib/timezone-server";
import {
  getUserByChatId,
  isPrivateChat,
  type TelegramCallbackQuery,
  type TelegramMessage,
} from "@/lib/telegram-bot/auth";
import { clearSession, getSession } from "@/lib/telegram-bot/sessions";
import {
  handleTaskCommand,
  continueTaskWizard,
  handleTaskCallback,
  handleCommentSessionText,
} from "@/lib/telegram-bot/task-flow";
import {
  handleEventCommand,
  continueEventWizard,
  handleEventCallback,
} from "@/lib/telegram-bot/event-flow";
import { handleListTasks } from "@/lib/telegram-bot/list-tasks";
import { handleListCalendar } from "@/lib/telegram-bot/list-calendar";
import { handleTodayDigest } from "@/lib/telegram-bot/list-today";
import {
  handleDoneCommand,
  handleStatusCommand,
  handleStatusCallback,
} from "@/lib/telegram-bot/status-flow";
import {
  handleCommentCommand,
  handleCommentPickCallback,
  handleReplyComment,
} from "@/lib/telegram-bot/comment-flow";
import {
  handleInboxCommand,
  handleInboxCallback,
} from "@/lib/telegram-bot/inbox-flow";
import {
  handleStandupCommand,
  continueStandupWizard,
  handleStandupCallback,
} from "@/lib/telegram-bot/standup-flow";
import { handleLeaveCommand } from "@/lib/telegram-bot/leave-flow";
import {
  handleRetroCommand,
  continueRetroWizard,
  handleRetroCallback,
} from "@/lib/telegram-bot/retro-flow";
import {
  continueNlClarify,
  handleNaturalLanguage,
  handleNlCallback,
} from "@/lib/telegram-bot/nl-flow";
import { isInterpretConfigured } from "@/lib/telegram-interpret/ollama";

async function sendHelp(chatId: string) {
  const tz = await getAppTimezone();
  const nlHint = isInterpretConfigured()
    ? [
        "",
        "<b>Natural language</b>",
        "Just type — no slash needed. Examples:",
        "lunch with Ali tomorrow 1pm",
        "add task Fix login to Alpha",
        "cuti esok",
        "what's on my calendar today",
        "Bot asks if something's missing, then confirms.",
        "Tip: use phone keyboard dictation (not Telegram voice notes).",
      ]
    : [];

  const text = [
    "<b>Perfect bot commands</b>",
    ...nlHint,
    "",
    "<b>Create (shortcuts)</b>",
    "/task — new task wizard",
    "/task Project | Title — one-shot task",
    "/event — new calendar event",
    "/event Title | start | end",
    "/leave today | tomorrow | dates",
    "",
    "<b>View</b>",
    "/tasks — open tasks",
    "/tasks today | week | project Name",
    "/calendar today | tomorrow | week | team",
    "/today — daily digest",
    "",
    "<b>Actions</b>",
    "/done &lt;task&gt;",
    "/status &lt;task&gt; todo|in_progress|review|done",
    "/comment &lt;task&gt; | message",
    "/standup — daily standup wizard",
    "/retro went_well | note",
    "/inbox — unread notifications",
    "",
    "/cancel — abort wizard / NL flow",
    "/help — this message",
    "",
    `<i>Times use app timezone: ${tz}</i>`,
  ].join("\n");

  const result = await sendTelegramMessage(chatId, text);
  if (!result.ok) {
    console.error("[telegram-bot] /help send failed:", result.description);
    await sendTelegramMessage(chatId, text.replace(/<[^>]+>/g, ""), {
      parseMode: null,
    });
  }
}

function parseCommand(text: string): { cmd: string; args: string } | null {
  if (!text.startsWith("/")) return null;
  const space = text.indexOf(" ");
  const rawCmd = space === -1 ? text : text.slice(0, space);
  const cmd = rawCmd.split("@")[0].toLowerCase();
  const args = space === -1 ? "" : text.slice(space + 1);
  return { cmd, args };
}

export async function handleTelegramBotMessage(
  user: AuthUser,
  chatId: string,
  message: TelegramMessage
) {
  const text = message.text?.trim() || "";

  if (message.reply_to_message?.text && !text.startsWith("/")) {
    await handleReplyComment(user, chatId, text, message.reply_to_message.text);
    return;
  }

  if (!text.startsWith("/")) {
    const session = await getSession(chatId);
    if (session?.flow === "nl" && session.step === "clarify") {
      await continueNlClarify(user, chatId, text);
      return;
    }
    if (session?.flow === "nl" && session.step === "confirm") {
      await sendTelegramMessage(
        chatId,
        "Tap Confirm or Cancel below, or send /cancel."
      );
      return;
    }
    if (session) {
      if (await handleCommentSessionText(user, chatId, text)) return;
      if (await continueTaskWizard(user, chatId, text)) return;
      if (await continueEventWizard(user, chatId, text)) return;
      if (await continueStandupWizard(user, chatId, text)) return;
      if (await continueRetroWizard(user, chatId, text)) return;
      await sendTelegramMessage(
        chatId,
        "Send /cancel to abort, or /help for commands."
      );
      return;
    }

    // Free-text NL (no slash, no session)
    if (text) {
      await handleNaturalLanguage(user, chatId, text);
      return;
    }
    return;
  }

  const parsed = parseCommand(text);
  if (!parsed) {
    return;
  }

  switch (parsed.cmd) {
    case "/help":
      await sendHelp(chatId);
      break;
    case "/cancel":
      await clearSession(chatId);
      await sendTelegramMessage(chatId, "Cancelled.");
      break;
    case "/task":
      await handleTaskCommand(user, chatId, parsed.args);
      break;
    case "/tasks":
      await handleListTasks(
        user,
        chatId,
        parsed.args.split(/\s+/).filter(Boolean)
      );
      break;
    case "/event":
      await handleEventCommand(user, chatId, parsed.args);
      break;
    case "/calendar":
      await handleListCalendar(
        user,
        chatId,
        parsed.args.split(/\s+/).filter(Boolean)
      );
      break;
    case "/today":
      await handleTodayDigest(user, chatId);
      break;
    case "/done":
      await handleDoneCommand(user, chatId, parsed.args);
      break;
    case "/status":
      await handleStatusCommand(user, chatId, parsed.args);
      break;
    case "/comment":
      await handleCommentCommand(user, chatId, parsed.args);
      break;
    case "/inbox":
      await handleInboxCommand(
        user,
        chatId,
        parsed.args.split(/\s+/).filter(Boolean)
      );
      break;
    case "/standup":
      await handleStandupCommand(user, chatId, parsed.args);
      break;
    case "/leave":
      await handleLeaveCommand(user, chatId, parsed.args);
      break;
    case "/retro":
      await handleRetroCommand(user, chatId, parsed.args);
      break;
    default:
      await sendTelegramMessage(chatId, "Unknown command. Send /help.");
  }
}

export async function handleTelegramBotCallback(
  user: AuthUser,
  chatId: string,
  query: TelegramCallbackQuery
) {
  const data = query.data || "";
  await answerCallbackQuery(query.id);

  if (data.startsWith("nl:") || data.startsWith("np:")) {
    await handleNlCallback(user, chatId, data);
    return;
  }
  if (data.startsWith("lt:")) {
    const page = parseInt(data.slice(3), 10) || 0;
    await handleListTasks(user, chatId, [], page);
    return;
  }
  if (data.startsWith("lc:")) {
    const page = parseInt(data.slice(3), 10) || 0;
    await handleListCalendar(user, chatId, [], page);
    return;
  }
  if (data.startsWith("nr:")) {
    await handleInboxCallback(user, chatId, data);
    return;
  }
  if (data.startsWith("st:")) {
    await handleStatusCallback(user, chatId, data);
    return;
  }
  if (data.startsWith("cm:")) {
    await handleCommentPickCallback(user, chatId, data.slice(3));
    return;
  }
  if (data.startsWith("tc:")) {
    const { handleCommentToTask } = await import("@/lib/telegram-bot/task-flow");
    await handleCommentToTask(user, chatId, data.slice(3));
    return;
  }
  if (
    data.startsWith("pj:") ||
    data.startsWith("ua:") ||
    data.startsWith("ct:") ||
    data.startsWith("td:")
  ) {
    await handleTaskCallback(user, chatId, data);
    return;
  }
  if (
    data.startsWith("et:") ||
    data.startsWith("eu:") ||
    data.startsWith("ce:")
  ) {
    await handleEventCallback(user, chatId, data);
    return;
  }
  if (data.startsWith("su:")) {
    await handleStandupCallback(user, chatId, data);
    return;
  }
  if (data.startsWith("rs:") || data.startsWith("rc:")) {
    await handleRetroCallback(user, chatId, data);
    return;
  }
}

export async function handleTelegramUpdate(update: {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}) {
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = String(cq.message?.chat.id);
    if (!chatId) return;
    const user = await getUserByChatId(chatId);
    if (!user) {
      await sendTelegramMessage(
        chatId,
        "Link your account in Perfect Settings first."
      );
      return;
    }
    await handleTelegramBotCallback(user, chatId, cq);
    return;
  }

  const message = update.message;
  if (!message?.text || !message.chat?.id) return;
  if (!isPrivateChat(message)) return;

  const chatId = String(message.chat.id);
  const user = await getUserByChatId(chatId);
  if (!user) {
    await sendTelegramMessage(
      chatId,
      "Link your Telegram in Perfect Settings → generate a code → /start &lt;code&gt;"
    );
    return;
  }

  await handleTelegramBotMessage(user, chatId, message);
}
