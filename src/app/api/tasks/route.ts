import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { queryTasks } from "@/lib/query-tasks";
import { createTaskForUser } from "@/lib/create-task";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rows = await queryTasks({
    projectId: url.searchParams.get("projectId") || undefined,
    status: url.searchParams.get("status") || undefined,
    assigneeId: url.searchParams.get("assigneeId") || undefined,
    sprintId: url.searchParams.get("sprintId") || undefined,
  });

  return NextResponse.json({ tasks: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "create_tasks")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, priority, projectId, assigneeId, dueDate, status, sprintId, estimate } = body;

  if (!title || !projectId) {
    return NextResponse.json(
      { error: "Title and project are required" },
      { status: 400 }
    );
  }

  if (assigneeId && !hasPermission(user.role, "assign_tasks")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const task = await createTaskForUser(user, {
    title,
    description,
    priority,
    projectId,
    assigneeId,
    dueDate,
    status,
    sprintId,
    estimate,
  });

  return NextResponse.json({ task }, { status: 201 });
}
