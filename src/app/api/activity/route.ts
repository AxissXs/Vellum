import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgoUtc(n: number): Date {
  const d = startOfUtcDay(new Date());
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function buildFilterConditions(params: {
  entityType: string | null;
  userId: string | null;
  from: string | null;
  to: string | null;
  q: string | null;
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

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10) || 25)
  );
  const entityType = url.searchParams.get("entityType");
  const userId = url.searchParams.get("userId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const q = url.searchParams.get("q")?.trim() || null;
  const includeSummary =
    url.searchParams.get("includeSummary") === "1" ||
    (url.searchParams.get("includeSummary") !== "0" && page === 1);

  const feedFilters = buildFilterConditions({ entityType, userId, from, to, q });
  const feedWhere = feedFilters.length > 0 ? and(...feedFilters) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(feedWhere);

  const total = countResult.count;

  const rows = await db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      tag: activityLogs.tag,
      severity: activityLogs.severity,
      createdAt: activityLogs.createdAt,
      userName: users.name,
      userAvatar: users.avatarUrl,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(feedWhere)
    .orderBy(desc(activityLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  let summary = null;

  if (includeSummary) {
    const todayStart = startOfUtcDay(new Date());
    const last7Start = daysAgoUtc(6);

    const summaryBase = buildFilterConditions({
      entityType,
      userId,
      from: null,
      to: null,
      q,
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

    summary = {
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

  return NextResponse.json({
    activities: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary,
  });
}
