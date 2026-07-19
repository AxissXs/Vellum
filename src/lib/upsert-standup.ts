import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { standups } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export type UpsertStandupInput = {
  sprintId?: string | null;
  yesterday?: string | null;
  today?: string | null;
  blockers?: string | null;
  date?: Date;
};

export async function upsertStandupForUser(user: AuthUser, input: UpsertStandupInput) {
  if (!input.yesterday && !input.today && !input.blockers) {
    throw new Error("At least one of yesterday/today/blockers is required");
  }

  const day = input.date ? new Date(input.date) : new Date();
  const start = startOfDay(day);
  const end = endOfDay(day);

  const [match] = await db
    .select()
    .from(standups)
    .where(
      and(
        eq(standups.userId, user.id),
        gte(standups.date, start),
        lte(standups.date, end)
      )
    )
    .limit(1);

  let standup;
  if (match) {
    const [updated] = await db
      .update(standups)
      .set({
        sprintId: input.sprintId ?? match.sprintId,
        yesterday: input.yesterday ?? match.yesterday,
        today: input.today ?? match.today,
        blockers: input.blockers ?? match.blockers,
        date: day,
      })
      .where(eq(standups.id, match.id))
      .returning();
    standup = updated;
  } else {
    const [created] = await db
      .insert(standups)
      .values({
        userId: user.id,
        sprintId: input.sprintId || null,
        date: day,
        yesterday: input.yesterday || null,
        today: input.today || null,
        blockers: input.blockers || null,
      })
      .returning();
    standup = created;
  }

  logActivity({
    userId: user.id,
    action: "created_standup",
    entityType: "standup",
    entityId: standup.id,
    details: `Logged standup for ${day.toISOString().slice(0, 10)}`,
  });

  return standup;
}
