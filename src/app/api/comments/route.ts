import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { comments, users, tasks } from "@/db/schema";
import { eq, asc, isNull, and } from "drizzle-orm";
import { broadcastCommentEvent, broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendNotification, broadcastEvent } from "@/lib/notifications";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const taskId = url.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const rows = await db
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
    .orderBy(asc(comments.createdAt));

  return NextResponse.json({ comments: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, taskId, parentId } = await req.json();
  if (!content || !taskId) {
    return NextResponse.json(
      { error: "Content and taskId are required" },
      { status: 400 }
    );
  }

  // Validate parentId if provided
  if (parentId) {
    const [parent] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, parentId), isNull(comments.deletedAt)))
      .limit(1);
    if (!parent) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 400 });
    }
    if (parent.parentId) {
      return NextResponse.json({ error: "Cannot nest replies more than 1 level deep" }, { status: 400 });
    }
  }

  const [comment] = await db
    .insert(comments)
    .values({ content, taskId, authorId: user.id, parentId: parentId || null })
    .returning();

  const [task] = await db.select({ title: tasks.title, projectId: tasks.projectId, assigneeId: tasks.assigneeId }).from(tasks).where(eq(tasks.id, taskId)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "created_comment",
    entityType: "comment",
    entityId: comment.id,
    details: parentId
      ? `Replied to a comment on task: ${task?.title || taskId}`
      : `Commented on task: ${task?.title || taskId}`,
    ipAddress: getClientIP(req),
    snapshots: [{ tableName: "comments", recordId: comment.id, snapshot: comment, snapshotType: "after" }],
  });

  const result = {
    ...comment,
    authorName: user.name,
    authorAvatar: user.avatarUrl,
  };

  // Broadcast real-time event for comments
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

  // Also broadcast a task update so viewers on the project board see activity
  if (task?.projectId) {
    await broadcastTaskEvent(task.projectId, {
      type: "updated",
      taskId,
      actorUserId: user.id,
      actorName: user.name || "Someone",
    });
  }

  // Send notification to task assignee (only for top-level comments, not replies)
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
        tag: `comment-${comment.id}`,
      },
      url: `/dashboard/projects/${task.projectId}`,
    });
  }

  // Send notification to parent comment author for replies
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
        url: `/dashboard/projects/${task.projectId}`,
      });
    }
  }

  // Broadcast to supergroup/channel (always)
  if (task) {
    await broadcastEvent({
      type: "new_comment",
      title: parentId ? "New Reply" : "New Comment",
      content: `${user.name || "Someone"} ${parentId ? "replied on" : "commented on"} "${task.title}"`,
      url: `/dashboard/projects/${task.projectId}`,
    });
  }

  return NextResponse.json({ comment: result }, { status: 201 });
}
