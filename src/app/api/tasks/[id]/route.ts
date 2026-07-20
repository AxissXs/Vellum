import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { hasPermission } from "@/lib/permissions";
import { eq, and, isNull } from "drizzle-orm";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { updateTaskForUser } from "@/lib/update-task";
import { getTaskById } from "@/lib/query-tasks";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await getTaskById(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "edit_tasks")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, priority, assigneeId, dueDate, position, sprintId, estimate } = body;

  if (
    assigneeId !== undefined &&
    assigneeId !== null &&
    !hasPermission(user.role, "assign_tasks")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (sprintId !== undefined && !hasPermission(user.role, "edit_sprints")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const task = await updateTaskForUser(user, id, {
    title,
    description,
    status,
    priority,
    assigneeId,
    dueDate,
    position,
    sprintId,
    estimate,
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "delete_tasks")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).limit(1);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await db
    .update(tasks)
    .set({ deletedAt: new Date(), deletedBy: user.id })
    .where(eq(tasks.id, id));

  logActivity({
    userId: user.id,
    action: "deleted_task",
    entityType: "task",
    entityId: id,
    details: `Deleted task: ${task.title}`,
  });

  await broadcastTaskEvent(task.projectId, {
    type: "deleted",
    taskId: id,
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  return NextResponse.json({ success: true });
}
