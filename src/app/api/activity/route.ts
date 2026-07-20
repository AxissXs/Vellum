import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import {
  buildActivityFilterConditions,
  getActivitySummary,
} from "@/lib/activity-summary";

export const dynamic = "force-dynamic";

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
  const entityId = url.searchParams.get("entityId");
  const userId = url.searchParams.get("userId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const q = url.searchParams.get("q")?.trim() || null;
  const includeSummary =
    url.searchParams.get("includeSummary") === "1" ||
    (url.searchParams.get("includeSummary") !== "0" && page === 1);

  const feedFilters = buildActivityFilterConditions({
    entityType,
    entityId,
    userId,
    from,
    to,
    q,
  });
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

  const summary = includeSummary
    ? await getActivitySummary({ entityType, userId, q })
    : null;

  return NextResponse.json({
    activities: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary,
  });
}
