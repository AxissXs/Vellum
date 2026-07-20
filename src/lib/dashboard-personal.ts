import { and, desc, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, projects, standups, tasks } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { queryCalendar } from "@/lib/query-calendar";
import { queryNotificationsForUser } from "@/lib/query-notifications";
import { getAppTimezone } from "@/lib/timezone-server";
import {
  appAllDayEndIso,
  appAllDayStartIso,
  formatInAppTz,
  nowInAppTz,
  toAppDateKey,
} from "@/lib/timezone";

export type PersonalDashboardData = {
  timezone: string;
  todayLabel: string;
  todayKey: string;
  counts: {
    open: number;
    dueToday: number;
    overdue: number;
    inReview: number;
  };
  dueTodayTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    status: string;
    projectId: string;
  }>;
  schedules: Array<{
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    allDay: boolean;
    type: string;
  }>;
  focusTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    projectId: string;
    projectName: string | null;
    dueDate: string | null;
  }>;
  standup: {
    id: string;
    sprintId: string | null;
    yesterday: string | null;
    today: string | null;
    blockers: string | null;
  } | null;
  notifications: Array<{
    id: string;
    title: string;
    content: string;
    url: string | null;
    createdAt: string;
    actorName: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: string | null;
    createdAt: string;
  }>;
};

export async function loadPersonalDashboard(
  user: AuthUser
): Promise<PersonalDashboardData> {
  const timezone = await getAppTimezone();
  const now = nowInAppTz(timezone);
  const todayKey = toAppDateKey(now, timezone);
  const todayStart = new Date(appAllDayStartIso(todayKey, timezone));
  const todayEnd = new Date(appAllDayEndIso(todayKey, timezone));
  const todayLabel = formatInAppTz(now, "EEEE, MMM d", timezone);

  const me = eq(tasks.assigneeId, user.id);
  const notDeleted = isNull(tasks.deletedAt);
  const notDone = ne(tasks.status, "done");

  const [
    [openRow],
    [dueTodayRow],
    [overdueRow],
    [inReviewRow],
    calendar,
    focusJoined,
    standupRows,
    notificationRows,
    activityRows,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(me, notDeleted, notDone)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          me,
          notDeleted,
          notDone,
          sql`${tasks.dueDate} IS NOT NULL`,
          gte(tasks.dueDate, todayStart),
          lte(tasks.dueDate, todayEnd)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          me,
          notDeleted,
          notDone,
          sql`${tasks.dueDate} IS NOT NULL`,
          lte(tasks.dueDate, new Date(todayStart.getTime() - 1))
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(me, notDeleted, eq(tasks.status, "review"))),
    queryCalendar(user, {
      from: todayStart,
      to: todayEnd,
      scope: "me",
      layers: ["tasks", "schedules"],
    }),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        projectId: tasks.projectId,
        projectName: projects.name,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(me, notDeleted, inArray(tasks.status, ["in_progress", "review"]))
      )
      .orderBy(desc(tasks.updatedAt))
      .limit(8),
    db
      .select({
        id: standups.id,
        sprintId: standups.sprintId,
        yesterday: standups.yesterday,
        today: standups.today,
        blockers: standups.blockers,
      })
      .from(standups)
      .where(
        and(
          eq(standups.userId, user.id),
          gte(standups.date, todayStart),
          lte(standups.date, todayEnd)
        )
      )
      .orderBy(desc(standups.date))
      .limit(1),
    queryNotificationsForUser(user.id, { unreadOnly: true, limit: 5 }),
    db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        details: activityLogs.details,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .where(eq(activityLogs.userId, user.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(8),
  ]);

  return {
    timezone,
    todayLabel,
    todayKey,
    counts: {
      open: openRow.count,
      dueToday: dueTodayRow.count,
      overdue: overdueRow.count,
      inReview: inReviewRow.count,
    },
    dueTodayTasks: calendar.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      status: t.status,
      projectId: t.projectId,
    })),
    schedules: calendar.schedules.map((s) => ({
      id: s.id,
      title: s.title,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      allDay: s.allDay,
      type: s.type,
    })),
    focusTasks: focusJoined.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      projectId: t.projectId,
      projectName: t.projectName,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    })),
    standup: standupRows[0]
      ? {
          id: standupRows[0].id,
          sprintId: standupRows[0].sprintId,
          yesterday: standupRows[0].yesterday,
          today: standupRows[0].today,
          blockers: standupRows[0].blockers,
        }
      : null,
    notifications: notificationRows.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      url: n.url,
      createdAt: n.createdAt.toISOString(),
      actorName: n.actorName,
    })),
    recentActivity: activityRows.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
