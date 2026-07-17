import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { users, userSessions, activityLogs } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const sessions = await db
    .select({
      id: userSessions.id,
      ipAddress: userSessions.ipAddress,
      userAgent: userSessions.userAgent,
      success: userSessions.success,
      failedReason: userSessions.failedReason,
      createdAt: userSessions.createdAt,
    })
    .from(userSessions)
    .where(eq(userSessions.userId, id))
    .orderBy(desc(userSessions.createdAt))
    .limit(50);

  const recentActivity = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      ipAddress: activityLogs.ipAddress,
      tag: activityLogs.tag,
      severity: activityLogs.severity,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .where(eq(activityLogs.userId, id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(30);

  const lastLogin = sessions.find((s) => s.success);

  return NextResponse.json({
    user: {
      ...user,
      lastLoginAt: lastLogin?.createdAt ?? null,
      lastIp: lastLogin?.ipAddress ?? null,
    },
    sessions,
    recentActivity,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as { name?: string; email?: string; role?: string; status?: string; password?: string };

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Prevent superadmin from changing their own role or status
  if (id === currentUser?.id && (body.role || body.status)) {
    return NextResponse.json(
      { error: "You cannot change your own role or status" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (body.name) updateData.name = body.name.trim();
  if (body.email) updateData.email = body.email.toLowerCase().trim();
  if (body.role) updateData.role = body.role;
  if (body.status) updateData.status = body.status;
  if (body.password) {
    const { hashSync } = await import("bcryptjs");
    updateData.passwordHash = hashSync(body.password, 10);
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: updated });
}
