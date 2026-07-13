import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { sessions, users, userSessions } from "@/db/schema";
import { gt, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  // Active sessions: expiresAt is in the future
  const rows = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .leftJoin(users, sql`${users.id} = ${sessions.userId}`)
    .where(gt(sessions.expiresAt, now))
    .orderBy(desc(sessions.createdAt));

  // Get last IPs from user_sessions for each user
  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
  const ipMap = new Map<string, string | null>();

  if (userIds.length > 0) {
    const ipRows = await db
      .select({
        userId: userSessions.userId,
        ipAddress: userSessions.ipAddress,
      })
      .from(userSessions)
      .where(sql`${userSessions.userId} IN (${userIds.join(",")}) AND ${userSessions.success} = true`)
      .orderBy(desc(userSessions.createdAt));

    for (const r of ipRows) {
      if (r.userId && !ipMap.has(r.userId)) {
        ipMap.set(r.userId, r.ipAddress);
      }
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    ipAddress: r.userId ? ipMap.get(r.userId) ?? null : null,
  }));

  return NextResponse.json({ sessions: enriched });
}
