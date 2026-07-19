import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { telegramBotSessions } from "@/db/schema";

export type BotFlow = "task" | "event" | "standup" | "retro";

export type BotSession = {
  id: string;
  userId: string;
  chatId: string;
  flow: BotFlow;
  step: string;
  payload: Record<string, unknown>;
  expiresAt: Date;
};

const SESSION_TTL_MS = 15 * 60 * 1000;

function parseSession(row: typeof telegramBotSessions.$inferSelect): BotSession {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(row.payload || "{}");
  } catch {
    payload = {};
  }
  return {
    id: row.id,
    userId: row.userId,
    chatId: row.chatId,
    flow: row.flow as BotFlow,
    step: row.step,
    payload,
    expiresAt: row.expiresAt,
  };
}

export async function getSession(chatId: string): Promise<BotSession | null> {
  try {
    const [row] = await db
      .select()
      .from(telegramBotSessions)
      .where(
        and(
          eq(telegramBotSessions.chatId, chatId),
          gt(telegramBotSessions.expiresAt, new Date())
        )
      )
      .limit(1);
    return row ? parseSession(row) : null;
  } catch (err) {
    // Table missing (migration not applied yet) must not silence the bot.
    console.error("[telegram-bot] getSession failed:", err);
    return null;
  }
}

export async function upsertSession(input: {
  userId: string;
  chatId: string;
  flow: BotFlow;
  step: string;
  payload: Record<string, unknown>;
}) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const existing = await getSession(input.chatId);

  if (existing) {
    const [row] = await db
      .update(telegramBotSessions)
      .set({
        flow: input.flow,
        step: input.step,
        payload: JSON.stringify(input.payload),
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(telegramBotSessions.id, existing.id))
      .returning();
    return parseSession(row);
  }

  const [row] = await db
    .insert(telegramBotSessions)
    .values({
      userId: input.userId,
      chatId: input.chatId,
      flow: input.flow,
      step: input.step,
      payload: JSON.stringify(input.payload),
      expiresAt,
    })
    .returning();
  return parseSession(row);
}

export async function updateSessionPayload(
  chatId: string,
  step: string,
  payload: Record<string, unknown>
) {
  const existing = await getSession(chatId);
  if (!existing) return null;
  return upsertSession({
    userId: existing.userId,
    chatId,
    flow: existing.flow,
    step,
    payload: { ...existing.payload, ...payload },
  });
}

export async function clearSession(chatId: string) {
  await db
    .delete(telegramBotSessions)
    .where(eq(telegramBotSessions.chatId, chatId));
}
