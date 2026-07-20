import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";

export type ActivitySummaryFilters = {
  entityType?: string | null;
  userId?: string | null;
  q?: string | null;
};

export type ActivitySummary = {
  today: number;
  last7d: number;
  activeUsers7d: number;
  byEntityType: { entityType: string; count: number }[];
  byDay: { date: string; count: number }[];
  topActors: { userId: string; userName: string | null; count: number }[];
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgoUtc(n: number): Date {
  const d = startOfUtcDay(new Date());
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export function buildActivityFilterConditions(params: {
  entityType?: string | null;
  userId?: string | null;
  from?: string | null;
  to?: string | null;
  q?: string | null;
}): SQL[] {
  const conditions: SQL[] = [];
  if (params.entityType) {
    conditions.push(eq(activityLogs.entityType, params.entityType));
  }
  if (params.userId) {
    conditions.push(eq(activityLogs.userId, params.userId));
  }
  if (params.from) {
    conditions.push(gte(activityLogs.createdAt, new Date(params.from)));
  }
  if (params.to) {
    conditions.push(lte(activityLogs.createdAt, new Date(params.to)));
  }
  if (params.q) {
    const pattern = `%${params.q}%`;
    conditions.push(
      sql`(${activityLogs.details} ILIKE ${pattern} OR ${activityLogs.action} ILIKE ${pattern})`
    );
  }
  return conditions;
}

export async function getActivitySummary(
  filters: ActivitySummaryFilters = {}
): Promise<ActivitySummary> {
  const todayStart = startOfUtcDay(new Date());
  const last7Start = daysAgoUtc(6);

  const summaryBase = buildActivityFilterConditions({
    entityType: filters.entityType,
    userId: filters.userId,
    from: null,
    to: null,
    q: filters.q,
  });

  const todayWhere = and(...summaryBase, gte(activityLogs.createdAt, todayStart));
  const last7Where = and(...summaryBase, gte(activityLogs.createdAt, last7Start));

  const [[todayRow], [last7Row], [activeRow], byEntityType, byDayRaw, topActorsRaw] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityLogs)
        .where(todayWhere),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityLogs)
        .where(last7Where),
      db
        .select({
          count: sql<number>`count(distinct ${activityLogs.userId})::int`,
        })
        .from(activityLogs)
        .where(last7Where),
      db
        .select({
          entityType: activityLogs.entityType,
          count: sql<number>`count(*)::int`,
        })
        .from(activityLogs)
        .where(last7Where)
        .groupBy(activityLogs.entityType)
        .orderBy(sql`count(*) desc`),
      db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${activityLogs.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(activityLogs)
        .where(last7Where)
        .groupBy(sql`date_trunc('day', ${activityLogs.createdAt} AT TIME ZONE 'UTC')`)
        .orderBy(sql`date_trunc('day', ${activityLogs.createdAt} AT TIME ZONE 'UTC')`),
      db
        .select({
          userId: activityLogs.userId,
          userName: users.name,
          count: sql<number>`count(*)::int`,
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .where(last7Where)
        .groupBy(activityLogs.userId, users.name)
        .orderBy(sql`count(*) desc`)
        .limit(5),
    ]);

  const dayMap = new Map(byDayRaw.map((r) => [r.date, r.count]));
  const byDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgoUtc(i);
    const key = d.toISOString().slice(0, 10);
    byDay.push({ date: key, count: dayMap.get(key) ?? 0 });
  }

  return {
    today: todayRow.count,
    last7d: last7Row.count,
    activeUsers7d: activeRow.count,
    byEntityType,
    byDay,
    topActors: topActorsRaw.map((a) => ({
      userId: a.userId,
      userName: a.userName,
      count: a.count,
    })),
  };
}
