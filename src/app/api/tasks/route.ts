import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { eq, and, asc } from "drizzle-orm";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const status = url.searchParams.get("status");
  const assigneeId = url.searchParams.get("assigneeId");
  const sprintId = url.searchParams.get("sprintId");

  let conditions = [];
  if (projectId) conditions.push(eq(tasks.projectId, projectId));
  if (status) conditions.push(eq(tasks.status, status as any));
  if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));
  if (sprintId) conditions.push(eq(tasks.sprintId, sprintId));

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
      sprintId: tasks.sprintId,
      estimate: tasks.estimate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assigneeName: users.name,
      assigneeAvatar: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  return NextResponse.json({ tasks: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, priority, projectId, assigneeId, dueDate, status, sprintId, estimate } = body;

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
      sprintId: sprintId || null,
      estimate: estimate ?? null,
    })
    .returning();

  logActivity({
    userId: user.id,
    action: "created_task",
    entityType: "task",
    entityId: task.id,
    details: `Created task: ${task.title}`,
  });

  broadcastTaskEvent(projectId, {
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

  return NextResponse.json({ task }, { status: 201 });
}
