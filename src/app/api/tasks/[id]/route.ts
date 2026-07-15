import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tasks, activityLogs, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendPushNotification, isPushEnabled } from "@/lib/push";
import { sendInAppNotification } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, priority, assigneeId, dueDate, position } = body;

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

  const actionDetail =
    status !== undefined && statusLabels[status]
      ? `${task.title}: ${statusLabels[status]}`
      : `Updated task: ${task.title}`;

  await db.insert(activityLogs).values({
    userId: user.id,
    action: status !== undefined ? "changed_task_status" : "updated_task",
    entityType: "task",
    entityId: task.id,
    details: actionDetail,
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

  // Send push notification for status changes
  if (status !== undefined && task.assigneeId && task.assigneeId !== user.id) {
    const enabled = await isPushEnabled(task.assigneeId, "status_changed");
    if (enabled) {
      const label = statusLabels[status] || "updated";
      await sendPushNotification(task.assigneeId, {
        title: "Task Status Changed",
        body: `${user.name || "Someone"} ${label} "${task.title}"`,
        url: `/dashboard/tasks`,
        tag: `task-${task.id}`,
      });
    }

    const label = statusLabels[status] || "updated";
    await sendInAppNotification({
      userId: task.assigneeId,
      type: "status_changed",
      title: "Task Status Changed",
      content: `${user.name || "Someone"} ${label} "${task.title}"`,
      entityType: "task",
      entityId: task.id,
      actorUserId: user.id,
    });
  }

  // Send in-app notification for assignee changes
  if (assigneeId !== undefined && assigneeId && assigneeId !== user.id) {
    await sendInAppNotification({
      userId: assigneeId,
      type: "task_assigned",
      title: "Task Assigned to You",
      content: `${user.name || "Someone"} assigned you "${task.title}"`,
      entityType: "task",
      entityId: task.id,
      actorUserId: user.id,
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

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const projectId = task.projectId;

  await db.delete(tasks).where(eq(tasks.id, id));

  await db.insert(activityLogs).values({
    userId: user.id,
    action: "deleted_task",
    entityType: "task",
    entityId: id,
    details: `Deleted task: ${task.title}`,
  });

  await broadcastTaskEvent(projectId, {
    type: "deleted",
    taskId: id,
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  return NextResponse.json({ success: true });
}
