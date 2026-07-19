import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { tasks, users, taskStatusHistory } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendNotification } from "@/lib/notifications";

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  status?: "backlog" | "todo" | "in_progress" | "review" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeId?: string | null;
  dueDate?: Date | string | null;
  position?: string;
  sprintId?: string | null;
  estimate?: number | null;
};

const statusLabels: Record<string, string> = {
  backlog: "moved to Backlog",
  todo: "moved to To Do",
  in_progress: "moved to In Progress",
  review: "moved to Review",
  done: "marked as Done",
};

export async function updateTaskForUser(
  user: AuthUser,
  taskId: string,
  input: UpdateTaskInput
) {
  const [current] = await db.select().from(tasks).where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt))).limit(1);
  if (!current) return null;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.assigneeId !== undefined) updateData.assigneeId = input.assigneeId;
  if (input.dueDate !== undefined) {
    updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.position !== undefined) updateData.position = input.position;
  if (input.sprintId !== undefined) updateData.sprintId = input.sprintId || null;
  if (input.estimate !== undefined) updateData.estimate = input.estimate ?? null;

  const [task] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId))
    .returning();

  if (!task) return null;

  const statusChanged =
    input.status !== undefined && input.status !== current.status;

  const [, assignee] = await Promise.all([
    statusChanged
      ? db.insert(taskStatusHistory).values({
          taskId,
          sprintId: task.sprintId,
          status: input.status!,
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

  const actionDetail =
    input.status !== undefined && statusLabels[input.status]
      ? `${task.title}: ${statusLabels[input.status]}`
      : `Updated task: ${task.title}`;

  logActivity({
    userId: user.id,
    action: input.status !== undefined ? "changed_task_status" : "updated_task",
    entityType: "task",
    entityId: task.id,
    details: actionDetail,
  });

  await broadcastTaskEvent(task.projectId, {
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

  if (statusChanged) {
    const label = statusLabels[input.status!] || "updated";
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
  }

  const assigneeChanged =
    input.assigneeId !== undefined && input.assigneeId !== current.assigneeId;

  if (assigneeChanged && input.assigneeId && input.assigneeId !== user.id) {
    await sendNotification({
      userId: input.assigneeId,
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
      url: `/dashboard/projects/${task.projectId}`,
    });
  }

  return task;
}
