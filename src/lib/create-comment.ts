import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { comments, users, tasks } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { broadcastCommentEvent, broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendNotification } from "@/lib/notifications";
import { resolveMentionedUserIds } from "@/lib/mentions";

export async function createCommentForUser(
  user: AuthUser,
  taskId: string,
  content: string
) {
  const [comment] = await db
    .insert(comments)
    .values({ content, taskId, authorId: user.id })
    .returning();

  const [task] = await db
    .select({
      title: tasks.title,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  logActivity({
    userId: user.id,
    action: "created_comment",
    entityType: "comment",
    entityId: comment.id,
    details: `Commented on task: ${task?.title || taskId}`,
  });

  const result = {
    ...comment,
    authorName: user.name,
    authorAvatar: user.avatarUrl,
  };

  broadcastCommentEvent(taskId, {
    type: "created",
    comment: {
      ...result,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    },
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  if (task?.projectId) {
    broadcastTaskEvent(task.projectId, {
      type: "updated",
      taskId,
      actorUserId: user.id,
      actorName: user.name || "Someone",
    });
  }

  if (task?.assigneeId && task.assigneeId !== user.id) {
    await sendNotification({
      userId: task.assigneeId,
      type: "new_comment",
      title: "New Comment",
      content: `${user.name || "Someone"} commented on "${task.title}"`,
      entityType: "task",
      entityId: taskId,
      actorUserId: user.id,
      pushPayload: {
        title: "New Comment",
        body: `${user.name || "Someone"} commented on "${task.title}"`,
        tag: `task-${taskId}`,
      },
      url: `/dashboard/tasks`,
    });
  }

  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const mentionedIds = resolveMentionedUserIds(content, allUsers).filter(
    (id) => id !== user.id
  );

  for (const mentionedId of mentionedIds) {
    await sendNotification({
      userId: mentionedId,
      type: "comment_mention",
      title: "You were mentioned",
      content: `${user.name || "Someone"} mentioned you on "${task?.title || "a task"}"`,
      entityType: "task",
      entityId: taskId,
      actorUserId: user.id,
      pushPayload: {
        title: "You were mentioned",
        body: `${user.name || "Someone"} mentioned you on "${task?.title || "a task"}"`,
        tag: `mention-${taskId}`,
      },
      url: `/dashboard/tasks`,
    });
  }

  return result;
}

export async function queryCommentsForTask(taskId: string, limit = 50) {
  return db
    .select({
      id: comments.id,
      content: comments.content,
      taskId: comments.taskId,
      authorId: comments.authorId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorName: users.name,
      authorAvatar: users.avatarUrl,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.taskId, taskId))
    .orderBy(asc(comments.createdAt))
    .limit(limit);
}
