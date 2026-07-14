import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { sessions, users, activityLogs, userSessions, tasks, projects, teams } from "@/db/schema";
import { gt, gte, sql, eq, and } from "drizzle-orm";

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

  // Active sessions count
  const [activeSessionsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessions)
    .where(gt(sessions.expiresAt, now));

  // Total users
  const [totalUsersRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  // Users by status
  const statusRows = await db
    .select({ status: users.status, count: sql<number>`count(*)::int` })
    .from(users)
    .groupBy(users.status);

  // Activity in last 24h
  const [activity24hRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(gte(activityLogs.createdAt, oneDayAgo));

  // Failed logins in last 24h
  const [failedLogins24hRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userSessions)
    .where(and(gte(userSessions.createdAt, oneDayAgo), eq(userSessions.success, false)));

  // Total entities
  const [totalTasksRow] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks);
  const [totalProjectsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(projects);
  const [totalTeamsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(teams);

  // Activity breakdown by action (last 24h)
  const actionBreakdown = await db
    .select({ action: activityLogs.action, count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(gte(activityLogs.createdAt, oneDayAgo))
    .groupBy(activityLogs.action)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  return NextResponse.json({
    activeSessions: activeSessionsRow.count,
    totalUsers: totalUsersRow.count,
    userStatusBreakdown: statusRows.reduce((acc, r) => {
      acc[r.status ?? "active"] = r.count;
      return acc;
    }, {} as Record<string, number>),
    activity24h: activity24hRow.count,
    failedLogins24h: failedLogins24hRow.count,
    totalTasks: totalTasksRow.count,
    totalProjects: totalProjectsRow.count,
    totalTeams: totalTeamsRow.count,
    actionBreakdown,
  });
}
