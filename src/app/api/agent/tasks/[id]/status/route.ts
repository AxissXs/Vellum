import { NextRequest, NextResponse } from "next/server";
import { getSessionWithAuthMethod } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";

const statusLabels: Record<string, string> = {
  backlog: "moved to Backlog",
  todo: "moved to To Do",
  in_progress: "moved to In Progress",
  review: "moved to Review",
  done: "marked as Done",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionWithAuthMethod(req);
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, authMethod } = result;

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!status || !["backlog", "todo", "in_progress", "review", "done"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const [before] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);

  if (!before) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();

  await writeActivityLog({
    userId: user.id,
    action: before.status !== status ? "changed_task_status" : "updated_task",
    entityType: "task",
    entityId: id,
    details: before.status !== status
      ? `${updated.title}: ${statusLabels[status]}`
      : `Updated task: ${updated.title}`,
    ipAddress: getClientIP(req),
    actorType: authMethod === "token" ? "agent" : "user",
    snapshots: [
      { tableName: "tasks", recordId: id, snapshot: before, snapshotType: "before" },
      { tableName: "tasks", recordId: id, snapshot: updated, snapshotType: "after" },
    ],
  });

  await broadcastTaskEvent(updated.projectId, {
    type: "updated",
    task: {
      ...updated,
      dueDate: updated.dueDate?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      assigneeName: user.name,
      assigneeAvatar: user.avatarUrl,
    },
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  return NextResponse.json({ task: updated });
}
