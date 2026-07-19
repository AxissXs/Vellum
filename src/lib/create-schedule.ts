import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { scheduleEvents, tasks, users } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { sendNotification } from "@/lib/notifications";

export type ScheduleType = "work" | "meeting" | "leave" | "training" | "other";
export type ScheduleVisibility = "team" | "private";

export type CreateScheduleInput = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  description?: string | null;
  type?: ScheduleType;
  allDay?: boolean;
  visibility?: ScheduleVisibility;
  projectId?: string | null;
  userId?: string;
};

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

export async function createScheduleForUser(
  user: AuthUser,
  input: CreateScheduleInput
) {
  const targetUserId = input.userId || user.id;

  const [schedule] = await db
    .insert(scheduleEvents)
    .values({
      userId: targetUserId,
      createdById: user.id,
      title: input.title,
      description: input.description || null,
      type: input.type || "work",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      allDay: Boolean(input.allDay),
      visibility: input.visibility || "team",
      projectId: input.projectId || null,
    })
    .returning();

  logActivity({
    userId: user.id,
    action: "created_schedule",
    entityType: "schedule",
    entityId: schedule.id,
    details: `Created schedule: ${schedule.title}`,
  });

  if (targetUserId !== user.id) {
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
  if (schedule.type === "leave") {
    conflicts = await findDueDateConflicts(
      targetUserId,
      schedule.startsAt,
      schedule.endsAt
    );
  }

  const [assignee] = await db
    .select({ name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  return {
    schedule: {
      ...schedule,
      userName: assignee?.name ?? null,
      userAvatar: assignee?.avatarUrl ?? null,
    },
    conflicts,
  };
}
