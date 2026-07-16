import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { comments, users, tasks } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { broadcastCommentEvent, broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const [existing] = await db.select().from(comments).where(and(eq(comments.id, id), isNull(comments.deletedAt))).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (existing.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [comment] = await db
    .update(comments)
    .set({ content: content.trim(), updatedAt: new Date() })
    .where(eq(comments.id, id))
    .returning();

  const [task] = await db.select({ title: tasks.title, projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, comment.taskId)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "updated_comment",
    entityType: "comment",
    entityId: comment.id,
    details: `Updated comment on task: ${task?.title || comment.taskId}`,
    ipAddress: getClientIP(req),
    snapshots: [
      { tableName: "comments", recordId: comment.id, snapshot: existing, snapshotType: "before" },
      { tableName: "comments", recordId: comment.id, snapshot: comment, snapshotType: "after" },
    ],
  });

  const [author] = await db.select({ name: users.name, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, comment.authorId)).limit(1);

  const result = {
    ...comment,
    authorName: author?.name,
    authorAvatar: author?.avatarUrl,
  };

  await broadcastCommentEvent(comment.taskId, {
    type: "updated",
    comment: {
      ...result,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    },
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  // Also notify the project board
  if (task?.projectId) {
    await broadcastTaskEvent(task.projectId, {
      type: "updated",
      taskId: comment.taskId,
      actorUserId: user.id,
      actorName: user.name || "Someone",
    });
  }

  return NextResponse.json({ comment: result });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [existing] = await db.select().from(comments).where(and(eq(comments.id, id), isNull(comments.deletedAt))).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (existing.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [task] = await db.select({ title: tasks.title, projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, existing.taskId)).limit(1);

  await db
    .update(comments)
    .set({ deletedAt: new Date(), deletedBy: user.id })
    .where(eq(comments.id, id));

  await writeActivityLog({
    userId: user.id,
    action: "deleted_comment",
    entityType: "comment",
    entityId: id,
    details: `Soft-deleted comment on task: ${task?.title || existing.taskId}`,
    ipAddress: getClientIP(req),
    snapshots: [{ tableName: "comments", recordId: existing.id, snapshot: existing, snapshotType: "before" }],
  });

  await broadcastCommentEvent(existing.taskId, {
    type: "deleted",
    commentId: id,
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  if (task?.projectId) {
    await broadcastTaskEvent(task.projectId, {
      type: "updated",
      taskId: existing.taskId,
      actorUserId: user.id,
      actorName: user.name || "Someone",
    });
  }

  return NextResponse.json({ success: true });
}