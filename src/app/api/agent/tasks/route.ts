import { NextRequest, NextResponse } from "next/server";
import { getSessionWithAuthMethod } from "@/lib/auth";
import { db } from "@/db";
import { tasks, users, projects } from "@/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import { getTeamVisibleProjectIds, buildProjectVisibilityCondition } from "@/lib/project-visibility";
import { getAccessibleProject } from "@/lib/project-access";
import { writeActivityLog, getClientIP } from "@/lib/audit";
import { broadcastTaskEvent } from "@/lib/pusher-broadcast";
import { sendNotification, broadcastEvent } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const result = await getSessionWithAuthMethod(req);
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user } = result;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const status = url.searchParams.get("status");
  const assigneeId = url.searchParams.get("assigneeId");

  const teamVisibleIds = await getTeamVisibleProjectIds(user.id);

  let conditions = [
    isNull(tasks.deletedAt),
    buildProjectVisibilityCondition(user.id, teamVisibleIds),
  ];
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
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  return NextResponse.json({ tasks: rows });
}

export async function POST(req: NextRequest) {
  const result = await getSessionWithAuthMethod(req);
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, authMethod } = result;

  const body = await req.json();
  const { title, description, priority, projectId, assigneeId, dueDate, status } = body;

  if (!title || !projectId) {
    return NextResponse.json({ error: "Title and project are required" }, { status: 400 });
  }

  const project = await getAccessibleProject(user.id, projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
    actorType: authMethod === "token" ? "agent" : "user",
    snapshots: [{ tableName: "tasks", recordId: task.id, snapshot: task, snapshotType: "after" }],
  });

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
      url: `/dashboard/projects/${task.projectId}`,
    });
  }

  await broadcastEvent({
    type: "task_assigned",
    title: "New Task Assigned",
    content: `${user.name || "Someone"} assigned "${task.title}"${task.assigneeId ? "" : " (unassigned)"}`,
    url: `/dashboard/projects/${task.projectId}`,
  });

  return NextResponse.json({ task }, { status: 201 });
}
