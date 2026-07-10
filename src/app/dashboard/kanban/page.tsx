import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import KanbanBoardClient from "./KanbanBoardClient";

export const dynamic = "force-dynamic";

const statusColumns = [
  { key: "backlog", label: "Backlog", color: "bg-slate-500" },
  { key: "todo", label: "To Do", color: "bg-blue-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { key: "review", label: "Review", color: "bg-purple-500" },
  { key: "done", label: "Done", color: "bg-emerald-500" },
];

export default async function KanbanPage() {
  const user = await getSession();
  if (!user) return null;

  const allProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.archived, false))
    .orderBy(asc(projects.createdAt));

  const taskRows = await db
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
      projectColor: projects.color,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .orderBy(tasks.position, tasks.createdAt);

  const allUsers = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .orderBy(users.name);

  const columns = statusColumns.map((col) => ({
    ...col,
    tasks: taskRows
      .filter((t) => t.status === col.key)
      .map((t) => ({
        ...t,
        dueDate: t.dueDate?.toISOString() || null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
  }));

  return (
    <KanbanBoardClient
      initialColumns={columns}
      projects={allProjects}
      users={allUsers}
      currentUserId={user.id}
    />
  );
}