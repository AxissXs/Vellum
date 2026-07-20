import { and, desc, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, projects, tasks, users } from "@/db/schema";
import {
  getActivitySummary,
  type ActivitySummary,
} from "@/lib/activity-summary";
import { getAppTimezone } from "@/lib/timezone-server";
import {
  appAllDayEndIso,
  appAllDayStartIso,
  formatInAppTz,
  nowInAppTz,
  toAppDateKey,
} from "@/lib/timezone";

export type TeamInsightsData = {
  timezone: string;
  todayLabel: string;
  pulse: {
    activeProjects: number;
    openTasks: number;
    doneThisWeek: number;
    overdue: number;
    urgentOpen: number;
  };
  statusBreakdown: { status: string; count: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  activity: ActivitySummary;
  workload: Array<{
    userId: string | null;
    userName: string | null;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: string | null;
    createdAt: string;
    userName: string | null;
  }>;
};

export async function loadTeamInsights(): Promise<TeamInsightsData> {
  const timezone = await getAppTimezone();
  const now = nowInAppTz(timezone);
  const todayKey = toAppDateKey(now, timezone);
  const todayStart = new Date(appAllDayStartIso(todayKey, timezone));
  const todayLabel = formatInAppTz(now, "EEEE, MMM d", timezone);

  const weekStartKey = toAppDateKey(
    new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    timezone
  );
  const weekStart = new Date(appAllDayStartIso(weekStartKey, timezone));

  const notDeleted = isNull(tasks.deletedAt);
  const notDone = ne(tasks.status, "done");

  const [
    [projectRow],
    [openRow],
    [doneWeekRow],
    [overdueRow],
    [urgentRow],
    statusBreakdown,
    priorityBreakdown,
    activity,
    workloadRaw,
    recentRows,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(and(eq(projects.archived, false), isNull(projects.deletedAt))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(notDeleted, notDone)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          notDeleted,
          eq(tasks.status, "done"),
          gte(tasks.updatedAt, weekStart)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          notDeleted,
          notDone,
          sql`${tasks.dueDate} IS NOT NULL`,
          lte(tasks.dueDate, new Date(todayStart.getTime() - 1))
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(notDeleted, notDone, eq(tasks.priority, "urgent"))),
    db
      .select({
        status: tasks.status,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(notDeleted)
      .groupBy(tasks.status),
    db
      .select({
        priority: tasks.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(and(notDeleted, notDone))
      .groupBy(tasks.priority),
    getActivitySummary(),
    db
      .select({
        userId: tasks.assigneeId,
        userName: users.name,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(notDeleted, notDone, sql`${tasks.assigneeId} IS NOT NULL`))
      .groupBy(tasks.assigneeId, users.name)
      .orderBy(sql`count(*) desc`)
      .limit(8),
    db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        details: activityLogs.details,
        createdAt: activityLogs.createdAt,
        userName: users.name,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(10),
  ]);

  return {
    timezone,
    todayLabel,
    pulse: {
      activeProjects: projectRow.count,
      openTasks: openRow.count,
      doneThisWeek: doneWeekRow.count,
      overdue: overdueRow.count,
      urgentOpen: urgentRow.count,
    },
    statusBreakdown,
    priorityBreakdown,
    activity,
    workload: workloadRaw.map((w) => ({
      userId: w.userId,
      userName: w.userName,
      count: w.count,
    })),
    recentActivity: recentRows.map((r) => ({
      id: r.id,
      userId: r.userId,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      details: r.details,
      createdAt: r.createdAt.toISOString(),
      userName: r.userName,
    })),
  };
}
