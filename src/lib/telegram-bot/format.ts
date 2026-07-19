import { formatTelegramDateTime } from "@/lib/telegram-dates";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function formatTaskLine(
  task: {
    title: string;
    status: string;
    dueDate?: Date | null;
    projectName?: string | null;
  },
  timeZone: string
): string {
  const due = task.dueDate
    ? formatTelegramDateTime(task.dueDate, timeZone)
    : "no due";
  const project = task.projectName ? ` — ${escapeHtml(task.projectName)}` : "";
  return `• [${task.status}] ${escapeHtml(truncate(task.title, 60))} — ${due}${project}`;
}

export function formatScheduleLine(
  event: {
    title: string;
    type: string;
    startsAt: string;
    endsAt: string;
    allDay?: boolean;
  },
  timeZone: string
): string {
  const start = formatTelegramDateTime(new Date(event.startsAt), timeZone);
  const end = formatTelegramDateTime(new Date(event.endsAt), timeZone);
  const time = event.allDay ? "all day" : `${start}–${end}`;
  return `• ${time} ${escapeHtml(truncate(event.title, 50))} (${event.type})`;
}

export function splitPages<T>(items: T[], pageSize: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }
  return pages.length ? pages : [[]];
}

export function buildListMessage(
  header: string,
  lines: string[],
  page: number,
  totalPages: number
): string {
  const body = lines.length ? lines.join("\n") : "<i>Nothing here.</i>";
  const footer =
    totalPages > 1 ? `\n\n<i>Page ${page + 1}/${totalPages}</i>` : "";
  return `<b>${escapeHtml(header)}</b>\n${body}${footer}`;
}
