import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { standups } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import { upsertStandupForUser } from "@/lib/upsert-standup";

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
  const { sprintId, yesterday, today, blockers, date } = body;

  try {
    const standup = await upsertStandupForUser(user, {
      sprintId,
      yesterday,
      today,
      blockers,
      date: date ? new Date(date) : undefined,
    });
    return NextResponse.json({ standup }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid standup";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
