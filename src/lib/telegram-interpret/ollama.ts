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

function buildSystemPrompt(
  timezone: string,
  nowIso: string,
  preferredIntent?: TelegramIntent
): string {
  const bias = preferredIntent
    ? `Prefer intent "${preferredIntent}" when ambiguous.`
    : "";
  return [
    "You extract Perfect app commands from natural language into JSON.",
    `Current local datetime: ${nowIso}. Timezone: ${timezone}.`,
    "Resolve Malay and English relative dates (esok, tomorrow, petang, etc.).",
    "Never invent a missing date or start time.",
    "Default event duration is 1 hour only when start time is known.",
    "create_leave: all-day leave when dates are clear; set allDay true and scheduleType leave.",
    "create_task: needs title and projectName.",
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
  const nowForPrompt = `${new Date().toISOString()} (interpret relative to ${timezone})`;

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
    think: true,
    format: TELEGRAM_INTERPRET_JSON_SCHEMA,
    options: { temperature: 0 },
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(
          timezone,
          nowForPrompt,
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
