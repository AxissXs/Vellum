import { eq, asc, and, isNull } from "drizzle-orm";
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
  content: string,
  parentId?: string | null
) {
  if (parentId) {
    const [parent] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, parentId), isNull(comments.deletedAt)))
      .limit(1);
    if (!parent) {
      throw new Error("Parent comment not found");
    }
    if (parent.parentId) {
      throw new Error("Cannot nest replies more than 1 level deep");
    }
    if (parent.taskId !== taskId) {
      throw new Error("Parent comment belongs to a different task");
    }
  }

  const [comment] = await db
    .insert(comments)
    .values({
      content,
      taskId,
      authorId: user.id,
      parentId: parentId || null,
    })
    .returning();

  const [task] = await db
    .select({
      title: tasks.title,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  logActivity({
    userId: user.id,
    action: "created_comment",
    entityType: "comment",
    entityId: comment.id,
    details: parentId
      ? `Replied to a comment on task: ${task?.title || taskId}`
      : `Commented on task: ${task?.title || taskId}`,
  });

  const result = {
    ...comment,
    authorName: user.name,
    authorAvatar: user.avatarUrl,
  };

  await broadcastCommentEvent(taskId, {
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
    await broadcastTaskEvent(task.projectId, {
      type: "updated",
      taskId,
      actorUserId: user.id,
      actorName: user.name || "Someone",
    });
  }

  const projectUrl = task?.projectId
    ? `/dashboard/projects/${task.projectId}`
    : `/dashboard/tasks`;

  // Top-level comments notify assignee; replies notify parent author
  if (!parentId && task?.assigneeId && task.assigneeId !== user.id) {
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
      url: projectUrl,
    });
  }

  if (parentId) {
    const [parentAuthor] = await db
      .select({ authorId: comments.authorId })
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);
    if (parentAuthor && parentAuthor.authorId !== user.id) {
      await sendNotification({
        userId: parentAuthor.authorId,
        type: "new_comment",
        title: "New Reply",
        content: `${user.name || "Someone"} replied to your comment on "${task?.title || taskId}"`,
        entityType: "task",
        entityId: taskId,
        actorUserId: user.id,
        pushPayload: {
          title: "New Reply",
          body: `${user.name || "Someone"} replied to your comment on "${task?.title || taskId}"`,
          tag: `comment-${comment.id}`,
        },
        url: projectUrl,
      });
    }
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
      url: projectUrl,
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
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorName: users.name,
      authorAvatar: users.avatarUrl,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.taskId, taskId), isNull(comments.deletedAt)))
    .orderBy(asc(comments.createdAt))
    .limit(limit);
}
