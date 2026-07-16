import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectMilestones } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "edit_projects")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, dueDate, ownerId } = body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (ownerId !== undefined) updateData.ownerId = ownerId || null;

  const [milestone] = await db
    .update(projectMilestones)
    .set(updateData)
    .where(eq(projectMilestones.id, id))
    .returning();

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  logActivity({
    userId: user.id,
    action: "updated_milestone",
    entityType: "milestone",
    entityId: milestone.id,
    details: `Updated milestone: ${milestone.title}`,
  });

  return NextResponse.json({ milestone });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "edit_projects")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [milestone] = await db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.id, id))
    .limit(1);

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  await db.delete(projectMilestones).where(eq(projectMilestones.id, id));

  logActivity({
    userId: user.id,
    action: "deleted_milestone",
    entityType: "milestone",
    entityId: id,
    details: `Deleted milestone: ${milestone.title}`,
  });

  return NextResponse.json({ success: true });
}
