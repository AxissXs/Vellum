import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { activityLogs, userSessions, users } from "@/db/schema";
import { desc, gte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // --- Activity Logs (user actions) ---
  const activityRows = await db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      userName: users.name,
      userEmail: users.email,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .leftJoin(users, sql`${users.id} = ${activityLogs.userId}`)
    .orderBy(desc(activityLogs.createdAt))
    .limit(50);

  // --- User Sessions (login attempts) ---
  const sessionRows = await db
    .select({
      id: userSessions.id,
      userId: userSessions.userId,
      userName: users.name,
      userEmail: users.email,
      ipAddress: userSessions.ipAddress,
      success: userSessions.success,
      failedReason: userSessions.failedReason,
      createdAt: userSessions.createdAt,
    })
    .from(userSessions)
    .leftJoin(users, sql`${users.id} = ${userSessions.userId}`)
    .orderBy(desc(userSessions.createdAt))
    .limit(50);

  // Merge and sort by createdAt desc
  const allItems = [
    ...activityRows.map((r) => ({
      id: `${r.id}`,
      type: "action" as const,
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      details: r.details,
      ipAddress: null,
      createdAt: r.createdAt,
    })),
    ...sessionRows.map((r) => ({
      id: `${r.id}`,
      type: (r.success ? "login" : "login_failed") as "login" | "login_failed",
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      action: r.success ? "user_login" : "user_login_failed",
      entityType: null,
      entityId: null,
      details: r.failedReason ? `Failed login: ${r.failedReason}` : "User logged in",
      ipAddress: r.ipAddress,
      createdAt: r.createdAt,
    })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 100);

  // --- Mini Stats ---
  const [loginCount24h] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userSessions)
    .where(gte(userSessions.createdAt, oneDayAgo));

  const [failedCount24h] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userSessions)
    .where(sql`${userSessions.createdAt} >= ${oneDayAgo} AND ${userSessions.success} = false`);

  const [activeUsersQuery] = await db
    .select({ count: sql<number>`count(distinct ${userSessions.userId})::int` })
    .from(userSessions)
    .where(gte(userSessions.createdAt, oneDayAgo));

  return NextResponse.json({
    feed: allItems,
    stats: {
      logins24h: loginCount24h.count,
      failed24h: failedCount24h.count,
      activeUsers24h: activeUsersQuery.count,
    },
  });
}
