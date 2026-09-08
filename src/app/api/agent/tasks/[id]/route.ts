import { NextRequest, NextResponse } from "next/server";
import { getSessionWithAuthMethod } from "@/lib/auth";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { getAccessibleProject } from "@/lib/project-access";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionWithAuthMethod(req);
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, authMethod } = result;

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, priority, assigneeId, dueDate, position } = body;

  const [before] = await db.select().from(tasks).where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).limit(1);

  if (!before) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const project = await getAccessibleProject(user.id, before.projectId);
  if (!project) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (position !== undefined) updateData.position = position;

  const [task] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, id))
    .returning();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const statusLabels: Record<string, string> = {
    backlog: "moved to Backlog",
    todo: "moved to To Do",
    in_progress: "moved to In Progress",
    review: "moved to Review",
    done: "marked as Done",
  };

  const statusChanged = status !== undefined && before.status !== status;

  await writeActivityLog({
    userId: user.id,
    action: statusChanged ? "changed_task_status" : "updated_task",
    entityType: "task",
    entityId: task.id,
    details: statusChanged
      ? `${task.title}: ${statusLabels[status]}`
      : `Updated task: ${task.title}`,
    ipAddress: getClientIP(req),
    actorType: authMethod === "token" ? "agent" : "user",
    snapshots: [
      { tableName: "tasks" as const, recordId: task.id, snapshot: before, snapshotType: "before" as const },
      { tableName: "tasks", recordId: task.id, snapshot: task, snapshotType: "after" },
    ],
  });

  let assigneeName: string | null = null;
  let assigneeAvatar: string | null = null;
  if (task.assigneeId) {
    const [assignee] = await db
      .select({ name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, task.assigneeId))
      .limit(1);
    assigneeName = assignee?.name ?? null;
    assigneeAvatar = assignee?.avatarUrl ?? null;
  }

  await broadcastTaskEvent(task.projectId, {
    type: "updated",
    task: {
      ...task,
      dueDate: task.dueDate?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assigneeName,
      assigneeAvatar,
    },
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  return NextResponse.json({ task });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionWithAuthMethod(req);
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, authMethod } = result;

  const { id } = await params;

  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).limit(1);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const project = await getAccessibleProject(user.id, task.projectId);
  if (!project) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await db
    .update(tasks)
    .set({ deletedAt: new Date(), deletedBy: user.id })
    .where(eq(tasks.id, id));

  await writeActivityLog({
    userId: user.id,
    action: "deleted_task",
    entityType: "task",
    entityId: id,
    details: `Soft-deleted task: ${task.title}`,
    ipAddress: getClientIP(req),
    actorType: authMethod === "token" ? "agent" : "user",
    snapshots: [{ tableName: "tasks", recordId: task.id, snapshot: task, snapshotType: "before" }],
  });

  await broadcastTaskEvent(task.projectId, {
    type: "deleted",
    taskId: id,
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  return NextResponse.json({ success: true });
}
