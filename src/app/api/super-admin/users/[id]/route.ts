import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

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
