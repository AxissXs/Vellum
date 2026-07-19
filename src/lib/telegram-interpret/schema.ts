export const TELEGRAM_INTENTS = [
  "create_event",
  "create_task",
  "create_leave",
  "list_tasks",
  "list_calendar",
  "standup",
  "comment",
  "status",
  "unknown",
] as const;

export type TelegramIntent = (typeof TELEGRAM_INTENTS)[number];

export const SCHEDULE_TYPES = [
  "work",
  "meeting",
  "leave",
  "training",
  "other",
] as const;

export type ScheduleTypeIntent = (typeof SCHEDULE_TYPES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "review",
  "done",
] as const;
export const LIST_RANGES = ["today", "tomorrow", "week"] as const;

export type TelegramInterpretResult = {
  intent: TelegramIntent;
  title: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  scheduleType: ScheduleTypeIntent | null;
  assigneeName: string | null;
  projectName: string | null;
  priority: (typeof TASK_PRIORITIES)[number] | null;
  dueDate: string | null;
  status: (typeof TASK_STATUSES)[number] | null;
  listRange: (typeof LIST_RANGES)[number] | null;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion: string | null;
  missingFields: string[];
  raw: string;
};

export type InterpretTurn = { q: string; a: string };

/** Ollama structured-output JSON Schema */
export const TELEGRAM_INTERPRET_JSON_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: [...TELEGRAM_INTENTS] },
    title: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    startsAt: { type: ["string", "null"] },
    endsAt: { type: ["string", "null"] },
    allDay: { type: "boolean" },
    scheduleType: {
      type: ["string", "null"],
      enum: [...SCHEDULE_TYPES, null],
    },
    assigneeName: { type: ["string", "null"] },
    projectName: { type: ["string", "null"] },
    priority: {
      type: ["string", "null"],
      enum: [...TASK_PRIORITIES, null],
    },
    dueDate: { type: ["string", "null"] },
    status: {
      type: ["string", "null"],
      enum: [...TASK_STATUSES, null],
    },
    listRange: {
      type: ["string", "null"],
      enum: [...LIST_RANGES, null],
    },
    confidence: { type: "number" },
    needsClarification: { type: "boolean" },
    clarificationQuestion: { type: ["string", "null"] },
    missingFields: {
      type: "array",
      items: { type: "string" },
    },
    raw: { type: "string" },
  },
  required: [
    "intent",
    "title",
    "description",
    "startsAt",
    "endsAt",
    "allDay",
    "scheduleType",
    "assigneeName",
    "projectName",
    "priority",
    "dueDate",
    "status",
    "listRange",
    "confidence",
    "needsClarification",
    "clarificationQuestion",
    "missingFields",
    "raw",
  ],
} as const;

export function emptyInterpretResult(raw: string): TelegramInterpretResult {
  return {
    intent: "unknown",
    title: null,
    description: null,
    startsAt: null,
    endsAt: null,
    allDay: false,
    scheduleType: null,
    assigneeName: null,
    projectName: null,
    priority: null,
    dueDate: null,
    status: null,
    listRange: null,
    confidence: 0,
    needsClarification: true,
    clarificationQuestion: null,
    missingFields: [],
    raw,
  };
}

export function normalizeInterpretResult(
  raw: unknown,
  fallbackRaw: string
): TelegramInterpretResult {
  const base = emptyInterpretResult(fallbackRaw);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;

  const intent = TELEGRAM_INTENTS.includes(o.intent as TelegramIntent)
    ? (o.intent as TelegramIntent)
    : "unknown";

  const scheduleType =
    o.scheduleType &&
    SCHEDULE_TYPES.includes(o.scheduleType as ScheduleTypeIntent)
      ? (o.scheduleType as ScheduleTypeIntent)
      : null;

  const priority =
    o.priority && TASK_PRIORITIES.includes(o.priority as never)
      ? (o.priority as (typeof TASK_PRIORITIES)[number])
      : null;

  const status =
    o.status && TASK_STATUSES.includes(o.status as never)
      ? (o.status as (typeof TASK_STATUSES)[number])
      : null;

  const listRange =
    o.listRange && LIST_RANGES.includes(o.listRange as never)
      ? (o.listRange as (typeof LIST_RANGES)[number])
      : null;

  const missingFields = Array.isArray(o.missingFields)
    ? o.missingFields.filter((x): x is string => typeof x === "string")
    : [];

  return {
    intent,
    title: typeof o.title === "string" ? o.title : null,
    description: typeof o.description === "string" ? o.description : null,
    startsAt: typeof o.startsAt === "string" ? o.startsAt : null,
    endsAt: typeof o.endsAt === "string" ? o.endsAt : null,
    allDay: Boolean(o.allDay),
    scheduleType,
    assigneeName: typeof o.assigneeName === "string" ? o.assigneeName : null,
    projectName: typeof o.projectName === "string" ? o.projectName : null,
    priority,
    dueDate: typeof o.dueDate === "string" ? o.dueDate : null,
    status,
    listRange,
    confidence:
      typeof o.confidence === "number" && Number.isFinite(o.confidence)
        ? o.confidence
        : 0,
    needsClarification: Boolean(o.needsClarification),
    clarificationQuestion:
      typeof o.clarificationQuestion === "string"
        ? o.clarificationQuestion
        : null,
    missingFields,
    raw: typeof o.raw === "string" ? o.raw : fallbackRaw,
  };
}
