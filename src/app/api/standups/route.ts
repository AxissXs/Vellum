import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { standups, activityLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc, gte, lte, and } from "drizzle-orm";

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

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("userId");
  const sprintId = req.nextUrl.searchParams.get("sprintId");
  const dateParam = req.nextUrl.searchParams.get("date");

  const where = [];
  if (userId) where.push(eq(standups.userId, userId));
  if (sprintId) where.push(eq(standups.sprintId, sprintId));
  if (dateParam) {
    const start = startOfDay(new Date(dateParam));
    const end = endOfDay(new Date(dateParam));
    where.push(gte(standups.date, start), lte(standups.date, end));
  }

  const rows = await db
    .select()
    .from(standups)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(standups.date));

  return NextResponse.json({ standups: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { userId, sprintId, yesterday, today, blockers, date } = body;

  const targetUserId = userId || user.id;

  if (!yesterday && !today && !blockers) {
    return NextResponse.json(
      { error: "At least one of yesterday/today/blockers is required" },
      { status: 400 }
    );
  }

  const day = date ? new Date(date) : new Date();
  const start = startOfDay(day);
  const end = endOfDay(day);

  // Upsert: one standup per user per day.
  const [match] = await db
    .select()
    .from(standups)
    .where(
      and(
        eq(standups.userId, targetUserId),
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
        sprintId: sprintId || null,
        yesterday: yesterday ?? match.yesterday,
        today: today ?? match.today,
        blockers: blockers ?? match.blockers,
        date: day,
      })
      .where(eq(standups.id, match.id))
      .returning();
    standup = updated;
  } else {
    const [created] = await db
      .insert(standups)
      .values({
        userId: targetUserId,
        sprintId: sprintId || null,
        date: day,
        yesterday: yesterday || null,
        today: today || null,
        blockers: blockers || null,
      })
      .returning();
    standup = created;
  }

  await db.insert(activityLogs).values({
    userId: user.id,
    action: "created_standup",
    entityType: "standup",
    entityId: standup.id,
    details: `Logged standup for ${day.toISOString().slice(0, 10)}`,
  });

  return NextResponse.json({ standup }, { status: match ? 200 : 201 });
}
