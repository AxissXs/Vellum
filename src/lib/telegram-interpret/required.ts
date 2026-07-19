import type { TelegramInterpretResult, TelegramIntent } from "./schema";

const FIELD_QUESTIONS: Record<string, string> = {
  title: "What should I call this?",
  startsAt: "When should this start? (e.g. tomorrow 2pm)",
  endsAt: "How long, or when does it end? (e.g. 1h or 3pm)",
  projectName: "Which project should this task belong to?",
  assigneeName: "Who is this for? Send a name or @username.",
};

export function getMissingFields(result: TelegramInterpretResult): string[] {
  const missing: string[] = [];

  switch (result.intent) {
    case "create_event": {
      if (!result.title?.trim()) missing.push("title");
      if (!result.startsAt || Number.isNaN(Date.parse(result.startsAt))) {
        missing.push("startsAt");
      }
      if (!result.endsAt || Number.isNaN(Date.parse(result.endsAt))) {
        missing.push("endsAt");
      } else if (
        result.startsAt &&
        !Number.isNaN(Date.parse(result.startsAt)) &&
        new Date(result.endsAt) <= new Date(result.startsAt)
      ) {
        missing.push("endsAt");
      }
      break;
    }
    case "create_leave": {
      if (!result.startsAt || Number.isNaN(Date.parse(result.startsAt))) {
        missing.push("startsAt");
      }
      if (!result.endsAt || Number.isNaN(Date.parse(result.endsAt))) {
        missing.push("endsAt");
      } else if (
        result.startsAt &&
        !Number.isNaN(Date.parse(result.startsAt)) &&
        new Date(result.endsAt) < new Date(result.startsAt)
      ) {
        missing.push("endsAt");
      }
      break;
    }
    case "create_task": {
      if (!result.title?.trim()) missing.push("title");
      if (!result.projectName?.trim()) missing.push("projectName");
      break;
    }
    default:
      break;
  }

  return missing;
}

export function questionForField(
  field: string,
  result: TelegramInterpretResult
): string {
  if (
    result.clarificationQuestion &&
    result.missingFields?.includes(field)
  ) {
    return result.clarificationQuestion;
  }
  return FIELD_QUESTIONS[field] || `Please provide ${field}.`;
}

export function isMutationIntent(intent: TelegramIntent): boolean {
  return (
    intent === "create_event" ||
    intent === "create_task" ||
    intent === "create_leave"
  );
}

export function isListIntent(intent: TelegramIntent): boolean {
  return intent === "list_tasks" || intent === "list_calendar";
}
