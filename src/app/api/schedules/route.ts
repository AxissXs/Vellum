import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { scheduleEvents, tasks, users } from "@/db/schema";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { sendNotification } from "@/lib/notifications";

const SCHEDULE_TYPES = ["work", "meeting", "leave", "training", "other"] as const;
const VISIBILITIES = ["team", "private"] as const;

type ScheduleType = (typeof SCHEDULE_TYPES)[number];
type Visibility = (typeof VISIBILITIES)[number];

function isValidType(v: unknown): v is ScheduleType {
  return typeof v === "string" && (SCHEDULE_TYPES as readonly string[]).includes(v);
}

function isValidVisibility(v: unknown): v is Visibility {
  return typeof v === "string" && (VISIBILITIES as readonly string[]).includes(v);
}

async function findDueDateConflicts(
  userId: string,
  startsAt: Date,
  endsAt: Date
) {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.assigneeId, userId),
        sql`${tasks.dueDate} IS NOT NULL`,
        gte(tasks.dueDate, startsAt),
        lte(tasks.dueDate, endsAt)
      )
    );

  return rows
    .filter((r) => r.dueDate)
    .map((r) => ({
      taskId: r.id,
      taskTitle: r.title,
      dueDate: r.dueDate!.toISOString(),
    }));
}

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

  const [schedule] = await db
    .insert(scheduleEvents)
    .values({
      userId: targetUserId,
      createdById: user.id,
      title,
      description: description || null,
      type,
      startsAt: start,
      endsAt: end,
      allDay: Boolean(allDay),
      visibility,
      projectId: projectId || null,
    })
    .returning();

  logActivity({
    userId: user.id,
    action: "created_schedule",
    entityType: "schedule",
    entityId: schedule.id,
    details: `Created schedule: ${schedule.title}`,
  });

  if (assigningOther) {
    await sendNotification({
      userId: targetUserId,
      type: "schedule_assigned",
      title: "Schedule Assigned",
      content: `${user.name || "Someone"} scheduled "${schedule.title}" for you`,
      entityType: "schedule",
      entityId: schedule.id,
      actorUserId: user.id,
      pushPayload: {
        title: "Schedule Assigned",
        body: `${user.name || "Someone"} scheduled "${schedule.title}" for you`,
        tag: `schedule-${schedule.id}`,
      },
      url: "/dashboard/calendar",
    });
  }

  let conflicts: Awaited<ReturnType<typeof findDueDateConflicts>> = [];
  if (type === "leave") {
    conflicts = await findDueDateConflicts(targetUserId, start, end);
  }

  const [assignee] = await db
    .select({ name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  return NextResponse.json({
    schedule: {
      ...schedule,
      startsAt: schedule.startsAt.toISOString(),
      endsAt: schedule.endsAt.toISOString(),
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
      userName: assignee?.name ?? null,
      userAvatar: assignee?.avatarUrl ?? null,
    },
    conflicts,
  });
}
