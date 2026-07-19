import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";

export type TelegramMessage = {
  text?: string;
  chat?: { id: number; type?: string };
  from?: { username?: string };
  message_id?: number;
  reply_to_message?: { text?: string; message_id?: number };
};

export type TelegramCallbackQuery = {
  id: string;
  data?: string;
  message?: { chat: { id: number }; message_id: number };
  from?: { id: number };
};

export async function getUserByChatId(chatId: string): Promise<AuthUser | null> {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.telegramChatId, chatId))
    .limit(1);

  if (!row || row.status !== "active") return null;
  return row;
}

export function isPrivateChat(message: TelegramMessage): boolean {
  const type = message.chat?.type;
  // Telegram always sends type; treat missing as private so DMs aren't dropped.
  if (!type) return true;
  return type === "private";
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    ""
  );
}

export function taskDeepLink(projectId: string): string {
  const base = appBaseUrl();
  return base ? `${base}/dashboard/projects/${projectId}` : `/dashboard/projects/${projectId}`;
}

export function calendarDeepLink(): string {
  const base = appBaseUrl();
  return base ? `${base}/dashboard/calendar` : "/dashboard/calendar";
}
