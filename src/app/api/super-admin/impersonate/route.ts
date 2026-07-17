import { NextRequest, NextResponse } from "next/server";
import { getSession, createSession, SESSION_COOKIE, IMPERSONATOR_SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { db } from "@/db";
import { users, sessions, activityLogs } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { getClientIP } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const currentUser = await getSession();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Fetch target user
  const [target] = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.role === "superadmin") {
    return NextResponse.json({ error: "Cannot impersonate another superadmin" }, { status: 400 });
  }

  // Get the superadmin's current session ID from cookie
  const cookieStore = await req.headers.get("cookie") || "";
  const sessionMatch = cookieStore.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const superadminSessionId = sessionMatch?.[1];

  if (!superadminSessionId) {
    return NextResponse.json({ error: "No active session" }, { status: 400 });
  }

  // Verify superadmin's session is valid and won't be deleted
  const [superadminSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, superadminSessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!superadminSession) {
    return NextResponse.json({ error: "Superadmin session expired" }, { status: 401 });
  }

  // Create a new session as the target user (no userSessions insert = no lastLoginAt update)
  const impersonationSessionId = await createSession(target.id);

  // Log the impersonation
  const ipAddress = getClientIP(req);
  await db.insert(activityLogs).values({
    userId: currentUser.id,
    action: "impersonated_user",
    entityType: "user",
    entityId: target.id,
    details: JSON.stringify({ impersonatorId: currentUser.id, impersonatorName: currentUser.name, targetId: target.id, targetName: target.name }),
    ipAddress,
    tag: "impersonation",
    severity: "warning",
  });

  // Build response — set both cookies
  const res = NextResponse.json({ success: true, targetUser: target.name });

  // Set the impersonation session as the main session
  res.cookies.set(SESSION_COOKIE, impersonationSessionId, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  // Store the superadmin's original session ID
  res.cookies.set(IMPERSONATOR_SESSION_COOKIE, superadminSessionId, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return res;
}
