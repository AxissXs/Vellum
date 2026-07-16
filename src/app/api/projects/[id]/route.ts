import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const {
    name,
    description,
    color,
    icon,
    archived,
    status,
    health,
    visibility,
    goal,
    keyResults,
    risks,
    startDate,
    targetDate,
  } = body;

  const [before] = await db.select().from(projects).where(and(eq(projects.id, id), isNull(projects.deletedAt))).limit(1);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (color !== undefined) updateData.color = color;
  if (icon !== undefined) updateData.icon = icon;
  if (archived !== undefined) updateData.archived = archived;
  if (status !== undefined) updateData.status = status;
  if (health !== undefined) updateData.health = health;
  if (visibility !== undefined) updateData.visibility = visibility;
  if (goal !== undefined) updateData.goal = goal;
  if (keyResults !== undefined) updateData.keyResults = keyResults;
  if (risks !== undefined) updateData.risks = risks;
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;

  const [project] = await db
    .update(projects)
    .set(updateData)
    .where(eq(projects.id, id))
    .returning();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await writeActivityLog({
    userId: user.id,
    action: "updated_project",
    entityType: "project",
    entityId: project.id,
    details: `Updated project: ${project.name}`,
    ipAddress: getClientIP(req),
    snapshots: [
      ...(before ? [{ tableName: "projects" as const, recordId: project.id, snapshot: before, snapshotType: "before" as const }] : []),
      { tableName: "projects", recordId: project.id, snapshot: project, snapshotType: "after" },
    ],
  });

  return NextResponse.json({ project });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await db
    .update(projects)
    .set({ deletedAt: new Date(), deletedBy: user.id })
    .where(eq(projects.id, id));

  await writeActivityLog({
    userId: user.id,
    action: "deleted_project",
    entityType: "project",
    entityId: id,
    details: `Soft-deleted project: ${project.name}`,
    ipAddress: getClientIP(req),
    snapshots: [{ tableName: "projects", recordId: project.id, snapshot: project, snapshotType: "before" }],
  });

  return NextResponse.json({ success: true });
}
