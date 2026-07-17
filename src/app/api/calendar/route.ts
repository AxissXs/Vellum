import { NextRequest, NextResponse } from "next/server";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import {
  activityLogs,
  scheduleEvents,
  tasks,
  users,
} from "@/db/schema";
import { hasPermission } from "@/lib/permissions";
import { getMalaysiaHolidaysInRange } from "@/lib/holidays/malaysia";

const SCHEDULE_TYPES = ["work", "meeting", "leave", "training", "other"] as const;
const VISIBILITIES = ["team", "private"] as const;

type ScheduleType = (typeof SCHEDULE_TYPES)[number];
type Visibility = (typeof VISIBILITIES)[number];

function isAdmin(role: string) {
  return role === "admin" || role === "superadmin";
}

function serializeSchedule(
  row: {
    id: string;
    userId: string;
    createdById: string | null;
    title: string;
    description: string | null;
    type: ScheduleType;
    startsAt: Date;
    endsAt: Date;
    allDay: boolean;
    visibility: Visibility;
    projectId: string | null;
    createdAt: Date;
    updatedAt: Date;
    userName?: string | null;
    userAvatar?: string | null;
  }
) {
  return {
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "view_calendar")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "from and to query params are required" },
      { status: 400 }
    );
  }

  const from = new Date(fromParam);
  const to = new Date(toParam);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid from/to dates" }, { status: 400 });
  }

  const scope = url.searchParams.get("scope") === "team" ? "team" : "me";
  const filterUserId = url.searchParams.get("userId");
  const layersParam = url.searchParams.get("layers") || "schedules,activity,tasks,holidays";
  const layers = new Set(layersParam.split(",").map((l) => l.trim()).filter(Boolean));

  const targetUserId =
    scope === "me" ? user.id : filterUserId || null;

  const assignee = alias(users, "assignee");
  const canSeePrivate = isAdmin(user.role);

  let schedules: ReturnType<typeof serializeSchedule>[] = [];
  if (layers.has("schedules")) {
    const visibilityFilter = canSeePrivate
      ? undefined
      : or(
          eq(scheduleEvents.visibility, "team"),
          eq(scheduleEvents.userId, user.id)
        );

    const userFilter = targetUserId
      ? eq(scheduleEvents.userId, targetUserId)
      : undefined;

    // Overlap: startsAt <= to AND endsAt >= from
    const rangeFilter = and(
      lte(scheduleEvents.startsAt, to),
      gte(scheduleEvents.endsAt, from)
    );

    const conditions = [rangeFilter, visibilityFilter, userFilter].filter(
      Boolean
    );

    const rows = await db
      .select({
        id: scheduleEvents.id,
        userId: scheduleEvents.userId,
        createdById: scheduleEvents.createdById,
        title: scheduleEvents.title,
        description: scheduleEvents.description,
        type: scheduleEvents.type,
        startsAt: scheduleEvents.startsAt,
        endsAt: scheduleEvents.endsAt,
        allDay: scheduleEvents.allDay,
        visibility: scheduleEvents.visibility,
        projectId: scheduleEvents.projectId,
        createdAt: scheduleEvents.createdAt,
        updatedAt: scheduleEvents.updatedAt,
        userName: users.name,
        userAvatar: users.avatarUrl,
      })
      .from(scheduleEvents)
      .leftJoin(users, eq(scheduleEvents.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(scheduleEvents.startsAt));

    schedules = rows.map(serializeSchedule);
  }

  let activity: Array<{
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: string | null;
    createdAt: string;
    userName: string | null;
    userAvatar: string | null;
  }> = [];

  if (layers.has("activity")) {
    const conditions = [
      gte(activityLogs.createdAt, from),
      lte(activityLogs.createdAt, to),
    ];
    if (targetUserId) {
      conditions.push(eq(activityLogs.userId, targetUserId));
    }

    const rows = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        details: activityLogs.details,
        createdAt: activityLogs.createdAt,
        userName: users.name,
        userAvatar: users.avatarUrl,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(and(...conditions))
      .limit(500);

    activity = rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  let taskDue: Array<{
    id: string;
    title: string;
    dueDate: string;
    assigneeId: string | null;
    assigneeName: string | null;
    projectId: string;
    status: string;
  }> = [];

  if (layers.has("tasks")) {
    const conditions = [
      sql`${tasks.dueDate} IS NOT NULL`,
      gte(tasks.dueDate, from),
      lte(tasks.dueDate, to),
    ];
    if (targetUserId) {
      conditions.push(eq(tasks.assigneeId, targetUserId));
    }

    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        assigneeId: tasks.assigneeId,
        assigneeName: assignee.name,
        projectId: tasks.projectId,
        status: tasks.status,
      })
      .from(tasks)
      .leftJoin(assignee, eq(tasks.assigneeId, assignee.id))
      .where(and(...conditions));

    taskDue = rows
      .filter((r) => r.dueDate)
      .map((r) => ({
        id: r.id,
        title: r.title,
        dueDate: r.dueDate!.toISOString(),
        assigneeId: r.assigneeId,
        assigneeName: r.assigneeName,
        projectId: r.projectId,
        status: r.status,
      }));
  }

  const holidays = layers.has("holidays")
    ? getMalaysiaHolidaysInRange(from, to)
    : [];

  // Leave vs task due-date conflicts for leave schedules in range
  const leaveConflicts: Array<{
    scheduleId: string;
    scheduleTitle: string;
    userId: string;
    taskId: string;
    taskTitle: string;
    dueDate: string;
  }> = [];

  const leaveSchedules = schedules.filter((s) => s.type === "leave");
  if (leaveSchedules.length > 0 && layers.has("tasks")) {
    for (const leave of leaveSchedules) {
      for (const task of taskDue) {
        if (task.assigneeId !== leave.userId || !task.dueDate) continue;
        const due = new Date(task.dueDate).getTime();
        const start = new Date(leave.startsAt).getTime();
        const end = new Date(leave.endsAt).getTime();
        if (due >= start && due <= end) {
          leaveConflicts.push({
            scheduleId: leave.id,
            scheduleTitle: leave.title,
            userId: leave.userId,
            taskId: task.id,
            taskTitle: task.title,
            dueDate: task.dueDate,
          });
        }
      }
    }
  }

  return NextResponse.json({
    schedules,
    activity,
    tasks: taskDue,
    holidays,
    conflicts: leaveConflicts,
    scope,
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "Use POST /api/schedules to create schedules" },
    { status: 405 }
  );
}
