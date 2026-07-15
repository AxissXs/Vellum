import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { comments, users, activityLogs, tasks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { broadcastCommentEvent, broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendNotification } from "@/lib/notifications";

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
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorName: users.name,
      authorAvatar: users.avatarUrl,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.taskId, taskId))
    .orderBy(asc(comments.createdAt));

  return NextResponse.json({ comments: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, taskId } = await req.json();
  if (!content || !taskId) {
    return NextResponse.json(
      { error: "Content and taskId are required" },
      { status: 400 }
    );
  }

  const [comment] = await db
    .insert(comments)
    .values({ content, taskId, authorId: user.id })
    .returning();

  const [task] = await db.select({ title: tasks.title, projectId: tasks.projectId, assigneeId: tasks.assigneeId }).from(tasks).where(eq(tasks.id, taskId)).limit(1);

  await db.insert(activityLogs).values({
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

  // Send notification to task assignee
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
        tag: `comment-${comment.id}`,
      },
      url: `/dashboard/projects/${task.projectId}`,
    });
  }

  return NextResponse.json({ comment: result }, { status: 201 });
}