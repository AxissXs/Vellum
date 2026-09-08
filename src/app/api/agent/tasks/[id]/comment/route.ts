import { NextRequest, NextResponse } from "next/server";
import { getSessionWithAuthMethod } from "@/lib/auth";
import { db } from "@/db";
import { comments, tasks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";
import { broadcastCommentEvent } from "@/lib/pusher-broadcast";
import { getAccessibleProject } from "@/lib/project-access";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionWithAuthMethod(req);
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, authMethod } = result;

  const { id: taskId } = await params;
  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const project = await getAccessibleProject(user.id, task.projectId);
  if (!project) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const [comment] = await db
    .insert(comments)
    .values({ content: content.trim(), taskId, authorId: user.id })
    .returning();

  await writeActivityLog({
    userId: user.id,
    action: "created_comment",
    entityType: "comment",
    entityId: comment.id,
    details: `Commented on task: ${task.title}`,
    ipAddress: getClientIP(req),
    actorType: authMethod === "token" ? "agent" : "user",
    snapshots: [{ tableName: "comments", recordId: comment.id, snapshot: comment, snapshotType: "after" }],
  });

  await broadcastCommentEvent(taskId, {
    type: "created",
    comment: {
      ...comment,
      authorName: user.name,
      authorAvatar: user.avatarUrl,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    },
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  return NextResponse.json({ comment }, { status: 201 });
}
