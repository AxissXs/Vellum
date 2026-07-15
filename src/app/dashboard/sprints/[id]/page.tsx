import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { sprints, tasks, users, projects } from "@/db/schema";
import { and, eq, asc, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import SprintDetailClient from "./SprintDetailClient";

export const dynamic = "force-dynamic";

const taskSelect = {
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
};

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  const { id } = await params;

  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
  if (!sprint) notFound();

  const [[project], sprintTasks, backlogTasks, allUsers, allProjects] =
    await Promise.all([
      db
        .select({ id: projects.id, name: projects.name, color: projects.color })
        .from(projects)
        .where(eq(projects.id, sprint.projectId))
        .limit(1),
      db
        .select(taskSelect)
        .from(tasks)
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .where(eq(tasks.sprintId, id)),
      db
        .select(taskSelect)
        .from(tasks)
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .where(
          and(eq(tasks.projectId, sprint.projectId), isNull(tasks.sprintId))
        ),
      db
        .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .orderBy(users.name),
      db
        .select({ id: projects.id, name: projects.name, color: projects.color })
        .from(projects)
        .where(eq(projects.archived, false))
        .orderBy(asc(projects.createdAt)),
    ]);

  const serializedTasks = sprintTasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() || null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    estimate: t.estimate ?? null,
  }));

  const serializedBacklog = backlogTasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() || null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    estimate: t.estimate ?? null,
  }));

  const serializedSprint = {
    ...sprint,
    startDate: sprint.startDate?.toISOString() || null,
    endDate: sprint.endDate?.toISOString() || null,
    createdAt: sprint.createdAt.toISOString(),
    updatedAt: sprint.updatedAt.toISOString(),
  };

  return (
    <SprintDetailClient
      sprint={serializedSprint}
      project={project || { id: sprint.projectId, name: "Unknown project", color: null }}
      tasks={serializedTasks}
      backlogTasks={serializedBacklog}
      users={allUsers}
      allProjects={allProjects}
      currentUserId={user?.id || ""}
    />
  );
}
