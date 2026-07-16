import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { desc, gte, lte, sql, eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const ip = searchParams.get("ip");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));

  const conditions = [];

  if (userId) {
    conditions.push(eq(activityLogs.userId, userId));
  }
  if (action) {
    conditions.push(sql`${activityLogs.action} ILIKE ${`%${action}%`}`);
  }
  if (ip) {
    conditions.push(sql`${activityLogs.ipAddress} ILIKE ${`%${ip}%`}`);
  }
  if (from) {
    conditions.push(gte(activityLogs.createdAt, new Date(from)));
  }
  if (to) {
    conditions.push(lte(activityLogs.createdAt, new Date(to)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(whereClause);

  const total = countResult.count;

  // Fetch rows
  const rows = await db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      userName: users.name,
      userEmail: users.email,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      ipAddress: activityLogs.ipAddress,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .leftJoin(users, sql`${users.id} = ${activityLogs.userId}`)
    .where(whereClause)
    .orderBy(desc(activityLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    logs: rows,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
