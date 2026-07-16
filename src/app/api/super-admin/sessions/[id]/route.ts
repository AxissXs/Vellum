import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent revoking your own session
  const [target] = await db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.id, id)).limit(1);

  if (!target) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (target.userId === currentUser?.id) {
    return NextResponse.json({ error: "Cannot revoke your own session" }, { status: 400 });
  }

  await db.delete(sessions).where(eq(sessions.id, id));

  return NextResponse.json({ success: true });
}
