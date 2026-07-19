import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendNotification, broadcastEvent } from "@/lib/notifications";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, priority, assigneeId, dueDate, position } = body;

  const [before] = await db.select().from(tasks).where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).limit(1);

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

  // Determine what actually changed
  const statusChanged = status !== undefined && before && before.status !== status;
  const assigneeChanged = assigneeId !== undefined && before && before.assigneeId !== assigneeId;
  const hasContentChanges =
    title !== undefined && before && before.title !== title ||
    description !== undefined && before && before.description !== description ||
    priority !== undefined && before && before.priority !== priority ||
    dueDate !== undefined && before && before.dueDate !== (dueDate ? new Date(dueDate) : null);

  const actionDetail =
    statusChanged
      ? `${task.title}: ${statusLabels[status]}`
      : `Updated task: ${task.title}`;

  await writeActivityLog({
    userId: user.id,
    action: statusChanged ? "changed_task_status" : "updated_task",
    entityType: "task",
    entityId: task.id,
    details: actionDetail,
    ipAddress: getClientIP(req),
    snapshots: [
      ...(before ? [{ tableName: "tasks" as const, recordId: task.id, snapshot: before, snapshotType: "before" as const }] : []),
      { tableName: "tasks", recordId: task.id, snapshot: task, snapshotType: "after" },
    ],
  });

  // Look up assignee info for the broadcast payload
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

  // Send notification for status changes only when status actually changed
  if (statusChanged) {
    const label = statusLabels[status] || "updated";
    const notifyUserId = task.assigneeId ?? task.creatorId;
    if (notifyUserId && notifyUserId !== user.id) {
      await sendNotification({
        userId: notifyUserId,
        type: "status_changed",
        title: "Task Status Changed",
        content: `${user.name || "Someone"} ${label} "${task.title}"`,
        entityType: "task",
        entityId: task.id,
        actorUserId: user.id,
        pushPayload: {
          title: "Task Status Changed",
          body: `${user.name || "Someone"} ${label} "${task.title}"`,
          tag: `task-${task.id}`,
        },
        url: `/dashboard/projects/${task.projectId}`,
      });
    }

    // Broadcast status change to supergroup/channel (public event)
    await broadcastEvent({
      type: "status_changed",
      title: "Task Status Changed",
      content: `${user.name || "Someone"} ${label} "${task.title}"`,
      url: `/dashboard/projects/${task.projectId}`,
    });
  }

  // Send notification for assignee changes only when assignee actually changed
  if (assigneeChanged && assigneeId) {
    await sendNotification({
      userId: assigneeId,
      type: "task_assigned",
      title: "Task Assigned to You",
      content: `${user.name || "Someone"} assigned you "${task.title}"`,
      entityType: "task",
      entityId: task.id,
      actorUserId: user.id,
      pushPayload: {
        title: "New Task Assigned",
        body: `${user.name || "Someone"} assigned you: ${task.title}`,
        tag: `task-${task.id}`,
      },
      url: `/dashboard/projects/${task.projectId}`,
    });

    // Broadcast assignee change to supergroup/channel (public event)
    await broadcastEvent({
      type: "task_assigned",
      title: "Task Assigned",
      content: `${user.name || "Someone"} assigned "${task.title}"`,
      url: `/dashboard/projects/${task.projectId}`,
    });
  }

  return NextResponse.json({ task });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).limit(1);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const projectId = task.projectId;

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
    snapshots: [{ tableName: "tasks", recordId: task.id, snapshot: task, snapshotType: "before" }],
  });

  await broadcastTaskEvent(projectId, {
    type: "deleted",
    taskId: id,
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  return NextResponse.json({ success: true });
}
