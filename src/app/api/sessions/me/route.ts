import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/db";
import { sessions, userSessions } from "@/db/schema";
import { eq, gt, desc, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentUser = await getSession();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const now = new Date();

  const activeSessions = await db
    .select({
      id: sessions.id,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, currentUser.id), gt(sessions.expiresAt, now)))
    .orderBy(desc(sessions.createdAt));

  const loginHistory = await db
    .select({
      ipAddress: userSessions.ipAddress,
      userAgent: userSessions.userAgent,
      createdAt: userSessions.createdAt,
    })
    .from(userSessions)
    .where(
      and(eq(userSessions.userId, currentUser.id), eq(userSessions.success, true))
    )
    .orderBy(desc(userSessions.createdAt))
    .limit(50);

  const enriched = activeSessions.map((session) => {
    const matchingLogin =
      loginHistory.find((login) => login.createdAt <= session.createdAt) ||
      loginHistory[0];

    return {
      id: session.id,
      isCurrent: session.id === currentSessionId,
      ipAddress: matchingLogin?.ipAddress ?? null,
      userAgent: matchingLogin?.userAgent ?? null,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    };
  });

  return NextResponse.json({ sessions: enriched });
}

export async function DELETE() {
  const currentUser = await getSession();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!currentSessionId) {
    return NextResponse.json({ error: "No active session" }, { status: 400 });
  }

  const now = new Date();
  await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.userId, currentUser.id),
        gt(sessions.expiresAt, now),
        sql`${sessions.id} != ${currentSessionId}`
      )
    );

  return NextResponse.json({ success: true });
}
