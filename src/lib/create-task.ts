import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendNotification } from "@/lib/notifications";

export type CreateTaskInput = {
  title: string;
  projectId: string;
  description?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "backlog" | "todo" | "in_progress" | "review" | "done";
  assigneeId?: string | null;
  dueDate?: Date | string | null;
  sprintId?: string | null;
  estimate?: number | null;
};

export async function createTaskForUser(user: AuthUser, input: CreateTaskInput) {
  const [task] = await db
    .insert(tasks)
    .values({
      title: input.title,
      description: input.description || null,
      priority: input.priority || "medium",
      status: input.status || "todo",
      projectId: input.projectId,
      assigneeId: input.assigneeId || null,
      creatorId: user.id,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      sprintId: input.sprintId || null,
      estimate: input.estimate ?? null,
    })
    .returning();

  logActivity({
    userId: user.id,
    action: "created_task",
    entityType: "task",
    entityId: task.id,
    details: `Created task: ${task.title}`,
  });

  let assigneeName = user.name;
  let assigneeAvatar = user.avatarUrl;
  if (task.assigneeId && task.assigneeId !== user.id) {
    const [assignee] = await db
      .select({ name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, task.assigneeId))
      .limit(1);
    assigneeName = assignee?.name ?? null;
    assigneeAvatar = assignee?.avatarUrl ?? null;
  }

  broadcastTaskEvent(input.projectId, {
    type: "created",
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

  if (task.assigneeId && task.assigneeId !== user.id) {
    await sendNotification({
      userId: task.assigneeId,
      type: "task_assigned",
      title: "New Task Assigned",
      content: `${user.name || "Someone"} assigned you "${task.title}"`,
      entityType: "task",
      entityId: task.id,
      actorUserId: user.id,
      pushPayload: {
        title: "New Task Assigned",
        body: `${user.name || "Someone"} assigned you "${task.title}"`,
        tag: `task-${task.id}`,
      },
      url: `/dashboard/tasks`,
    });
  }

  return task;
}
