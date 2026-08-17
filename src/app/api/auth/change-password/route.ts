import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { compareSync, hashSync } from "bcryptjs";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { currentPassword?: string; newPassword?: string };
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current password and new password are required" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const [userRecord] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!userRecord) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!compareSync(currentPassword, userRecord.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const newHash = hashSync(newPassword, 10);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

  await writeActivityLog({
    userId: user.id,
    action: "changed_password",
    entityType: "user",
    entityId: user.id,
    details: "User changed their password",
    ipAddress: getClientIP(req),
  });

  return NextResponse.json({ success: true });
}
