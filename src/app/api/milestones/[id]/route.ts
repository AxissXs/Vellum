import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectMilestones } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, isNull, and } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, dueDate, ownerId } = body;

  const [before] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, id), isNull(projectMilestones.deletedAt))).limit(1);

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

  await writeActivityLog({
    userId: user.id,
    action: "updated_milestone",
    entityType: "milestone",
    entityId: milestone.id,
    details: `Updated milestone: ${milestone.title}`,
    ipAddress: getClientIP(req),
    snapshots: [
      ...(before ? [{ tableName: "project_milestones" as const, recordId: milestone.id, snapshot: before, snapshotType: "before" as const }] : []),
      { tableName: "project_milestones", recordId: milestone.id, snapshot: milestone, snapshotType: "after" },
    ],
  });

  return NextResponse.json({ milestone });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [milestone] = await db
    .select()
    .from(projectMilestones)
    .where(and(eq(projectMilestones.id, id), isNull(projectMilestones.deletedAt)))
    .limit(1);

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  await db
    .update(projectMilestones)
    .set({ deletedAt: new Date(), deletedBy: user.id })
    .where(eq(projectMilestones.id, id));

  await writeActivityLog({
    userId: user.id,
    action: "deleted_milestone",
    entityType: "milestone",
    entityId: id,
    details: `Soft-deleted milestone: ${milestone.title}`,
    ipAddress: getClientIP(req),
    snapshots: [{ tableName: "project_milestones", recordId: milestone.id, snapshot: milestone, snapshotType: "before" }],
  });

  return NextResponse.json({ success: true });
}
