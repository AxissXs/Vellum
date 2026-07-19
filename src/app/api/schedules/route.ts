import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import {
  createScheduleForUser,
  type ScheduleType,
  type ScheduleVisibility,
} from "@/lib/create-schedule";

const SCHEDULE_TYPES = ["work", "meeting", "leave", "training", "other"] as const;
const VISIBILITIES = ["team", "private"] as const;

function isValidType(v: unknown): v is ScheduleType {
  return typeof v === "string" && (SCHEDULE_TYPES as readonly string[]).includes(v);
}

function isValidVisibility(v: unknown): v is Visibility {
  return typeof v === "string" && (VISIBILITIES as readonly string[]).includes(v);
}

type Visibility = ScheduleVisibility;

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    title,
    description,
    type = "work",
    startsAt,
    endsAt,
    allDay = false,
    visibility = "team",
    projectId,
    userId: assigneeId,
  } = body;

  if (!title || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: "title, startsAt, and endsAt are required" },
      { status: 400 }
    );
  }

  if (!isValidType(type)) {
    return NextResponse.json({ error: "Invalid schedule type" }, { status: 400 });
  }
  if (!isValidVisibility(visibility)) {
    return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
  }

  const targetUserId = assigneeId || user.id;
  const assigningOther = targetUserId !== user.id;

  if (assigningOther) {
    if (!hasPermission(user.role, "manage_schedules")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!hasPermission(user.role, "create_own_schedule")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  if (assigningOther) {
    const [exists] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  }

  const { schedule, conflicts } = await createScheduleForUser(user, {
    title,
    description,
    type,
    startsAt: start,
    endsAt: end,
    allDay: Boolean(allDay),
    visibility,
    projectId,
    userId: targetUserId,
  });

  return NextResponse.json({
    schedule: {
      ...schedule,
      startsAt: schedule.startsAt.toISOString(),
      endsAt: schedule.endsAt.toISOString(),
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    },
    conflicts,
  });
}
