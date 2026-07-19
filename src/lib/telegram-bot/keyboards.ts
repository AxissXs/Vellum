import type { InlineKeyboardMarkup } from "@/lib/telegram";

export const PAGE_SIZE = 10;

export function paginationKeyboard(
  prefix: string,
  page: number,
  totalPages: number
): InlineKeyboardMarkup | undefined {
  if (totalPages <= 1) return undefined;
  const row = [];
  if (page > 0) {
    row.push({ text: "◀ Prev", callback_data: `${prefix}:${page - 1}` });
  }
  if (page < totalPages - 1) {
    row.push({ text: "Next ▶", callback_data: `${prefix}:${page + 1}` });
  }
  return row.length ? { inline_keyboard: [row] } : undefined;
}

export function choiceKeyboard(
  prefix: string,
  items: Array<{ id: string; label: string }>,
  columns = 1
): InlineKeyboardMarkup {
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < items.length; i += columns) {
    const slice = items.slice(i, i + columns);
    rows.push(
      slice.map((item) => ({
        text: item.label.slice(0, 40),
        callback_data: `${prefix}:${item.id}`,
      }))
    );
  }
  return { inline_keyboard: rows };
}

export function confirmKeyboard(prefix: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Confirm", callback_data: `${prefix}:yes` },
        { text: "❌ Cancel", callback_data: `${prefix}:no` },
      ],
    ],
  };
}

export function taskActionKeyboard(taskId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "▶ Start", callback_data: `st:${taskId}:in_progress` },
        { text: "✅ Done", callback_data: `st:${taskId}:done` },
      ],
    ],
  };
}

export function notificationKeyboard(
  notificationId: string,
  entityType?: string | null,
  entityId?: string | null
): InlineKeyboardMarkup {
  const row = [
    { text: "✓ Read", callback_data: `nr:${notificationId}` },
  ];
  if (entityType === "task" && entityId) {
    row.push({ text: "💬 Comment", callback_data: `tc:${entityId}` });
    row.push({ text: "✅ Done", callback_data: `st:${entityId}:done` });
  }
  return { inline_keyboard: [row, [{ text: "Mark all read", callback_data: "nr:all" }]] };
}
