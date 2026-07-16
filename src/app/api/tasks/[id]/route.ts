import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tasks, users, taskStatusHistory } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { eq } from "drizzle-orm";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendNotification } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, priority, assigneeId, dueDate, position, sprintId, estimate } = body;

  const [current] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!current) {
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
  if (sprintId !== undefined) updateData.sprintId = sprintId || null;
  if (estimate !== undefined) updateData.estimate = estimate ?? null;

  const [task] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, id))
    .returning();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const statusChanged = status !== undefined && status !== current.status;

  const [, assignee] = await Promise.all([
    statusChanged
      ? db.insert(taskStatusHistory).values({
          taskId: id,
          sprintId: task.sprintId,
          status,
          changedAt: new Date(),
        })
      : Promise.resolve(),
    task.assigneeId
      ? db
          .select({ name: users.name, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.id, task.assigneeId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const statusLabels: Record<string, string> = {
    backlog: "moved to Backlog",
    todo: "moved to To Do",
    in_progress: "moved to In Progress",
    review: "moved to Review",
    done: "marked as Done",
  };

  const actionDetail =
    status !== undefined && statusLabels[status]
      ? `${task.title}: ${statusLabels[status]}`
      : `Updated task: ${task.title}`;

  logActivity({
    userId: user.id,
    action: status !== undefined ? "changed_task_status" : "updated_task",
    entityType: "task",
    entityId: task.id,
    details: actionDetail,
  });

  broadcastTaskEvent(task.projectId, {
    type: "updated",
    task: {
      ...task,
      dueDate: task.dueDate?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assigneeName: assignee?.name ?? null,
      assigneeAvatar: assignee?.avatarUrl ?? null,
    },
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  if (statusChanged && task.assigneeId && task.assigneeId !== user.id) {
    const label = statusLabels[status] || "updated";
    await sendNotification({
      userId: task.assigneeId,
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
      url: `/dashboard/tasks`,
    });
  }

  if (
    assigneeId !== undefined &&
    assigneeId &&
    assigneeId !== user.id &&
    assigneeId !== current.assigneeId
  ) {
    await sendNotification({
      userId: assigneeId,
      type: "task_assigned",
      title: "Task Assigned to You",
      content: `${user.name || "Someone"} assigned you "${task.title}"`,
      entityType: "task",
      entityId: task.id,
      actorUserId: user.id,
      pushPayload: {
        title: "Task Assigned to You",
        body: `${user.name || "Someone"} assigned you "${task.title}"`,
        tag: `task-${task.id}`,
      },
      url: `/dashboard/tasks`,
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

  const [task] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  logActivity({
    userId: user.id,
    action: "deleted_task",
    entityType: "task",
    entityId: id,
    details: `Deleted task: ${task.title}`,
  });

  broadcastTaskEvent(task.projectId, {
    type: "deleted",
    taskId: id,
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  return NextResponse.json({ success: true });
}
