import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { comments, users, activityLogs, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  const [existing] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
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

  const [task] = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, comment.taskId)).limit(1);

  await db.insert(activityLogs).values({
    userId: user.id,
    action: "updated_comment",
    entityType: "comment",
    entityId: comment.id,
    details: `Updated comment on task: ${task?.title || comment.taskId}`,
  });

  const [author] = await db.select({ name: users.name, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, comment.authorId)).limit(1);

  return NextResponse.json({
    comment: {
      ...comment,
      authorName: author?.name,
      authorAvatar: author?.avatarUrl,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [existing] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (existing.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [task] = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, existing.taskId)).limit(1);

  await db.delete(comments).where(eq(comments.id, id));

  await db.insert(activityLogs).values({
    userId: user.id,
    action: "deleted_comment",
    entityType: "comment",
    entityId: id,
    details: `Deleted comment on task: ${task?.title || existing.taskId}`,
  });

  return NextResponse.json({ success: true });
}