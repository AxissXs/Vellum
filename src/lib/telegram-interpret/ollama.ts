import { getAppTimezone } from "@/lib/timezone-server";
import {
  normalizeInterpretResult,
  TELEGRAM_INTERPRET_JSON_SCHEMA,
  type InterpretTurn,
  type TelegramIntent,
  type TelegramInterpretResult,
} from "./schema";

const DEFAULT_MODEL = "gemma4:e2b";
const TIMEOUT_MS = 30_000;
const MIN_CONFIDENCE = 0.5;

export function isInterpretConfigured(): boolean {
  return Boolean(process.env.LLM_INTERPRET_URL?.trim());
}

function interpretBaseUrl(): string {
  return (process.env.LLM_INTERPRET_URL || "").replace(/\/$/, "");
}

function interpretModel(): string {
  return process.env.LLM_INTERPRET_MODEL?.trim() || DEFAULT_MODEL;
}

function formatLocalDateTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  const offset = value("timeZoneName").replace("GMT", "") || "+00:00";

  return `${value("year")}-${value("month")}-${value("day")}T${value(
    "hour"
  )}:${value("minute")}:${value("second")}${offset}`;
}

function buildSystemPrompt(
  timezone: string,
  localDateTime: string,
  preferredIntent?: TelegramIntent
): string {
  const bias = preferredIntent
    ? `Prefer intent "${preferredIntent}" when ambiguous.`
    : "";
  return [
    "You extract Perfect app commands from natural language into JSON.",
    `Current local date: ${localDateTime.slice(0, 10)}. Current local datetime: ${localDateTime}. Timezone: ${timezone}.`,
    "Use the current local date as the anchor for every relative date.",
    "Resolve Malay and English relative dates (esok, tomorrow, petang, etc.).",
    "Treat times without an explicit timezone as local to the stated timezone.",
    "Return startsAt, endsAt, and dueDate as ISO 8601 with the correct numeric timezone offset; do not convert local clock times to UTC or append Z.",
    "For an event from 10 pm until 12 am, preserve local times 22:00 until 00:00 on the next calendar day.",
    "Use create_event for a scheduled appointment, visit, installation, job, meeting, or other calendar occurrence with a date or time.",
    "An event may describe work and name a person or location; that does not make it a task.",
    "Use create_task only for a to-do, backlog, or project work item, not for a scheduled calendar occurrence.",
    "If the message schedules or assigns work for a named person (e.g. for Akif, assign to Ali), set assigneeName to that person.",
    "assigneeName is the person the event or task is for, not a location or project.",
    "Never invent a missing date or start time.",
    "Default event duration is 1 hour only when start time is known.",
    "create_leave: all-day leave when dates are clear; set allDay true and scheduleType leave.",
    "create_task: needs title and projectName; set assigneeName when a person is named.",
    "list_tasks / list_calendar: set listRange today|tomorrow|week when possible.",
    "If incomplete, set needsClarification true, fill missingFields, and one short clarificationQuestion.",
    "Return only schema-compliant JSON.",
    bias,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildUserContent(
  text: string,
  opts?: {
    draft?: TelegramInterpretResult | null;
    turns?: InterpretTurn[];
  }
): string {
  const parts = [`User message:\n${text}`];
  if (opts?.draft) {
    parts.push(`Current draft JSON:\n${JSON.stringify(opts.draft, null, 2)}`);
  }
  if (opts?.turns?.length) {
    const qa = opts.turns
      .map((t, i) => `Q${i + 1}: ${t.q}\nA${i + 1}: ${t.a}`)
      .join("\n");
    parts.push(`Clarification Q&A:\n${qa}`);
    parts.push("Update the draft using the answers. Fill missing fields.");
  }
  return parts.join("\n\n");
}

export async function interpretTelegramText(
  text: string,
  opts?: {
    preferredIntent?: TelegramIntent;
    draft?: TelegramInterpretResult | null;
    turns?: InterpretTurn[];
  }
): Promise<
  | { ok: true; result: TelegramInterpretResult }
  | { ok: false; error: string }
> {
  if (!isInterpretConfigured()) {
    return { ok: false, error: "LLM interpret is not configured." };
  }

  const timezone = await getAppTimezone();
  const localDateTime = formatLocalDateTime(new Date(), timezone);

  const url = `${interpretBaseUrl()}/api/chat`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  const secret = process.env.LLM_INTERPRET_SECRET?.trim();
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  const body = {
    model: interpretModel(),
    stream: false,
    think: false,
    format: TELEGRAM_INTERPRET_JSON_SCHEMA,
    options: { temperature: 0 },
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(
          timezone,
          localDateTime,
          opts?.preferredIntent
        ),
      },
      {
        role: "user",
        content: buildUserContent(text, opts),
      },
    ],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Ollama HTTP ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      message?: { content?: string };
    };
    const content = data.message?.content;
    if (!content) {
      return { ok: false, error: "Empty model response." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, error: "Model returned non-JSON." };
    }

    let result = normalizeInterpretResult(parsed, text);
    if (result.confidence < MIN_CONFIDENCE && result.intent !== "unknown") {
      result = {
        ...result,
        needsClarification: true,
        clarificationQuestion:
          result.clarificationQuestion ||
          "Could you rephrase that with more detail?",
      };
    }

    // Preserve original user text as raw root
    if (!result.raw) result.raw = text;

    return { ok: true, result };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "LLM timed out."
          : err.message
        : "LLM request failed.";
    console.error("[telegram-interpret]", msg);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
