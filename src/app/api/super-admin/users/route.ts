import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { users, userSessions } from "@/db/schema";
import { eq, inArray, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      avatarUrl: users.avatarUrl,
      lastSeenAt: users.lastSeenAt,
      lastSeenIp: users.lastSeenIp,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(users.name);

  // Build map of userId -> latest successful session
  const userIds = userRows.map((u) => u.id);
  const sessionMap = new Map<
    string,
    { createdAt: Date; ipAddress: string | null }
  >();

  if (userIds.length > 0) {
    const sessionRows = await db
      .select({
        userId: userSessions.userId,
        createdAt: userSessions.createdAt,
        ipAddress: userSessions.ipAddress,
      })
      .from(userSessions)
      .where(
        and(
          inArray(userSessions.userId, userIds),
          eq(userSessions.success, true)
        )
      )
      .orderBy(desc(userSessions.createdAt));

    for (const s of sessionRows) {
      const uid = s.userId;
      if (uid && !sessionMap.has(uid)) {
        sessionMap.set(uid, {
          createdAt: s.createdAt,
          ipAddress: s.ipAddress,
        });
      }
    }
  }

  const merged = userRows.map((u) => ({
    ...u,
    lastLoginAt: sessionMap.get(u.id)?.createdAt ?? null,
    lastIp: sessionMap.get(u.id)?.ipAddress ?? null,
  }));

  return NextResponse.json({ users: merged });
}
