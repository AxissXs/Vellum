import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSession();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (id === currentSessionId) {
    return NextResponse.json(
      { error: "Cannot revoke your current session" },
      { status: 400 }
    );
  }

  const now = new Date();
  const [target] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, id),
        eq(sessions.userId, currentUser.id),
        gt(sessions.expiresAt, now)
      )
    )
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await db.delete(sessions).where(eq(sessions.id, id));

  return NextResponse.json({ success: true });
}
