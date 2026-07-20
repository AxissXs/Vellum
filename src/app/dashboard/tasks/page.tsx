import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, users } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { queryTasks } from "@/lib/query-tasks";
import TasksClient, { type TaskRow } from "./TasksClient";

export const dynamic = "force-dynamic";

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export default async function TasksPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [taskRows, userRows, projectRows] = await Promise.all([
    queryTasks(),
    db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.status, "active")),
    db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
      })
      .from(projects)
      .where(isNull(projects.deletedAt)),
  ]);

  const initialTasks: TaskRow[] = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    projectId: t.projectId,
    assigneeId: t.assigneeId,
    creatorId: t.creatorId,
    dueDate: toIso(t.dueDate),
    position: t.position,
    sprintId: t.sprintId,
    estimate: t.estimate,
    createdAt: toIso(t.createdAt)!,
    updatedAt: toIso(t.updatedAt)!,
    assigneeName: t.assigneeName,
    assigneeAvatar: t.assigneeAvatar,
    projectName: t.projectName,
    projectColor: t.projectColor,
  }));

  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading tasks…</div>}>
      <TasksClient
        initialTasks={initialTasks}
        users={userRows}
        projects={projectRows}
        currentUserId={user.id}
        userRole={user.role}
      />
    </Suspense>
  );
}
