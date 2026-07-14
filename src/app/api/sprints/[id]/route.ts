import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sprints, activityLogs, tasks } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, not } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
  if (!sprint) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }

  return NextResponse.json({ sprint });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, goal, startDate, endDate, status } = body;

  const [existing] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updateData.name = name;
  if (goal !== undefined) updateData.goal = goal;
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

  const nextStatus = status !== undefined ? status : existing.status;
  updateData.status = nextStatus;

  // Only one active sprint per project: deactivate siblings when activating this one.
  if (nextStatus === "active") {
    await db
      .update(sprints)
      .set({ status: "planned", updatedAt: new Date() })
      .where(and(eq(sprints.projectId, existing.projectId), eq(sprints.status, "active")));
  }

  // On completion, roll unfinished tasks back to the project backlog.
  if (nextStatus === "completed" && existing.status !== "completed") {
    await db
      .update(tasks)
      .set({ sprintId: null, updatedAt: new Date() })
      .where(and(eq(tasks.sprintId, id), not(eq(tasks.status, "done"))));
  }

  const [sprint] = await db.update(sprints).set(updateData).where(eq(sprints.id, id)).returning();

  await db.insert(activityLogs).values({
    userId: user.id,
    action: "updated_sprint",
    entityType: "sprint",
    entityId: sprint.id,
    details: `Updated sprint: ${sprint.name}`,
  });

  return NextResponse.json({ sprint });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
  if (!sprint) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }

  await db.delete(sprints).where(eq(sprints.id, id));

  await db.insert(activityLogs).values({
    userId: user.id,
    action: "deleted_sprint",
    entityType: "sprint",
    entityId: id,
    details: `Deleted sprint: ${sprint.name}`,
  });

  return NextResponse.json({ success: true });
}
