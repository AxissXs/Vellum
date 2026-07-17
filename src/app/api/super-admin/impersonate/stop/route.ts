import { NextRequest, NextResponse } from "next/server";
import { getSession, destroySession, SESSION_COOKIE, IMPERSONATOR_SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const currentUser = await getSession();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = req.headers.get("cookie") || "";
  const impersonatorMatch = cookieStore.match(new RegExp(`${IMPERSONATOR_SESSION_COOKIE}=([^;]+)`));
  const superadminSessionId = impersonatorMatch?.[1];

  if (!superadminSessionId) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
  }

  // Verify the superadmin's original session still exists
  const [originalSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, superadminSessionId))
    .limit(1);

  if (!originalSession) {
    // Original session expired — clean up impersonation session and cookie
    const currentSessionMatch = cookieStore.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    const currentSessionId = currentSessionMatch?.[1];
    if (currentSessionId) {
      await destroySession(currentSessionId);
    }

    const res = NextResponse.json({ error: "Original session expired" }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(IMPERSONATOR_SESSION_COOKIE);
    return res;
  }

  // Delete the impersonation session
  const currentSessionMatch = cookieStore.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const currentSessionId = currentSessionMatch?.[1];
  if (currentSessionId) {
    await destroySession(currentSessionId);
  }

  // Restore the superadmin's original session
  const res = NextResponse.json({ success: true });

  res.cookies.set(SESSION_COOKIE, superadminSessionId, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  res.cookies.delete(IMPERSONATOR_SESSION_COOKIE);

  return res;
}
