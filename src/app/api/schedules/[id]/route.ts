import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, sql, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { scheduleEvents, tasks, users } from "@/db/schema";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { broadcastScheduleEvent } from "@/lib/pusher-broadcast";
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
        lte(tasks.dueDate, endsAt),
        isNull(tasks.deletedAt)
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

function canMutateSchedule(
  user: { id: string; role: string },
  scheduleUserId: string
) {
  if (hasPermission(user.role, "manage_schedules")) return true;
  return scheduleUserId === user.id && hasPermission(user.role, "create_own_schedule");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [existing] = await db
    .select()
    .from(scheduleEvents)
    .where(eq(scheduleEvents.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canMutateSchedule(user, existing.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Partial<typeof scheduleEvents.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) {
    if (!body.title) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    updates.title = body.title;
  }
  if (body.description !== undefined) {
    updates.description = body.description || null;
  }
  if (body.type !== undefined) {
    if (!isValidType(body.type)) {
      return NextResponse.json({ error: "Invalid schedule type" }, { status: 400 });
    }
    updates.type = body.type;
  }
  if (body.visibility !== undefined) {
    if (!isValidVisibility(body.visibility)) {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    }
    updates.visibility = body.visibility;
  }
  if (body.allDay !== undefined) updates.allDay = Boolean(body.allDay);
  if (body.projectId !== undefined) updates.projectId = body.projectId || null;

  if (body.userId !== undefined && body.userId !== existing.userId) {
    if (!hasPermission(user.role, "manage_schedules")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    updates.userId = body.userId;
  }

  if (body.startsAt !== undefined) {
    const start = new Date(body.startsAt);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
    }
    updates.startsAt = start;
  }
  if (body.endsAt !== undefined) {
    const end = new Date(body.endsAt);
    if (Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid endsAt" }, { status: 400 });
    }
    updates.endsAt = end;
  }

  const nextStart = updates.startsAt ?? existing.startsAt;
  const nextEnd = updates.endsAt ?? existing.endsAt;
  if (nextEnd < nextStart) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const [schedule] = await db
    .update(scheduleEvents)
    .set(updates)
    .where(eq(scheduleEvents.id, id))
    .returning();

  logActivity({
    userId: user.id,
    action: "updated_schedule",
    entityType: "schedule",
    entityId: schedule.id,
    details: `Updated schedule: ${schedule.title}`,
  });

  const assigneeChanged =
    body.userId !== undefined && body.userId !== existing.userId;
  if (assigneeChanged && schedule.userId !== user.id) {
    const [assignee] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, schedule.userId))
      .limit(1);
    const actor = user.name || "Someone";
    const forName = assignee?.name || "someone";
    await sendNotification({
      userId: schedule.userId,
      type: "schedule_assigned",
      title: "Schedule Assigned",
      content: `${actor} scheduled "${schedule.title}" for you`,
      broadcastContent: `${actor} scheduled "${schedule.title}" for ${forName}`,
      entityType: "schedule",
      entityId: schedule.id,
      actorUserId: user.id,
      pushPayload: {
        title: "Schedule Assigned",
        body: `${actor} scheduled "${schedule.title}" for you`,
        tag: `schedule-${schedule.id}`,
      },
      url: "/dashboard/calendar",
    });
  }

  await broadcastScheduleEvent({
    type: "updated",
    scheduleId: schedule.id,
    userId: schedule.userId,
    actorUserId: user.id,
    actorName: user.name || "Someone",
    schedule: {
      id: schedule.id,
      userId: schedule.userId,
      title: schedule.title,
      type: schedule.type,
      startsAt: schedule.startsAt.toISOString(),
      endsAt: schedule.endsAt.toISOString(),
      allDay: schedule.allDay,
      visibility: schedule.visibility,
    },
  });

  const nextType = schedule.type;
  let conflicts: Awaited<ReturnType<typeof findDueDateConflicts>> = [];
  if (nextType === "leave") {
    conflicts = await findDueDateConflicts(
      schedule.userId,
      schedule.startsAt,
      schedule.endsAt
    );
  }

  const [assignee] = await db
    .select({ name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, schedule.userId))
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [existing] = await db
    .select()
    .from(scheduleEvents)
    .where(eq(scheduleEvents.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canMutateSchedule(user, existing.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(scheduleEvents).where(eq(scheduleEvents.id, id));

  logActivity({
    userId: user.id,
    action: "deleted_schedule",
    entityType: "schedule",
    entityId: id,
    details: `Deleted schedule: ${existing.title}`,
  });

  await broadcastScheduleEvent({
    type: "deleted",
    scheduleId: id,
    userId: existing.userId,
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  return NextResponse.json({ success: true });
}
