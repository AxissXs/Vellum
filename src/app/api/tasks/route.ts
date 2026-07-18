import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendNotification, broadcastEvent } from "@/lib/notifications";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const status = url.searchParams.get("status");
  const assigneeId = url.searchParams.get("assigneeId");

  let conditions = [isNull(tasks.deletedAt)];
  if (projectId) conditions.push(eq(tasks.projectId, projectId));
  if (status) conditions.push(eq(tasks.status, status as any));
  if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
      creatorId: tasks.creatorId,
      dueDate: tasks.dueDate,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assigneeName: users.name,
      assigneeAvatar: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  return NextResponse.json({ tasks: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, priority, projectId, assigneeId, dueDate, status } = body;

  if (!title || !projectId) {
    return NextResponse.json(
      { error: "Title and project are required" },
      { status: 400 }
    );
  }

  const [task] = await db
    .insert(tasks)
    .values({
      title,
      description: description || null,
      priority: priority || "medium",
      status: status || "todo",
      projectId,
      assigneeId: assigneeId || null,
      creatorId: user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
    })
    .returning();

  await writeActivityLog({
    userId: user.id,
    action: "created_task",
    entityType: "task",
    entityId: task.id,
    details: `Created task: ${task.title}`,
    ipAddress: getClientIP(req),
    snapshots: [{ tableName: "tasks", recordId: task.id, snapshot: task, snapshotType: "after" }],
  });

  // Broadcast real-time event
  await broadcastTaskEvent(projectId, {
    type: "created",
    task: {
      ...task,
      dueDate: task.dueDate?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assigneeName: user.name,
      assigneeAvatar: user.avatarUrl,
    },
    actorUserId: user.id,
    actorName: user.name || "Someone",
  });

  // Send notification to assignee if different from creator
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
        body: `${user.name || "Someone"} assigned you: ${task.title}`,
        tag: `task-${task.id}`,
      },
      url: `/dashboard/tasks`,
    });
  }

  // Broadcast to supergroup/channel (always, regardless of assignee)
  if (task.assigneeId) {
    await broadcastEvent({
      type: "task_assigned",
      title: "New Task Assigned",
      content: `${user.name || "Someone"} assigned "${task.title}" to ${task.assigneeId === user.id ? "themselves" : "someone"}`,
      url: `/dashboard/tasks`,
    });
  }

  return NextResponse.json({ task }, { status: 201 });
}
