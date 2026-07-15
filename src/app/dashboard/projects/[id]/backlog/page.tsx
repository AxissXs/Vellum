import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks, users, sprints } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import ProjectNav from "../ProjectNav";
import ProjectBacklogClient from "./ProjectBacklogClient";

export const dynamic = "force-dynamic";

export default async function ProjectBacklogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getSession();
  const { id } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const backlogTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      estimate: tasks.estimate,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(eq(tasks.projectId, id), isNull(tasks.sprintId)))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  const sprintRows = await db
    .select({ id: sprints.id, name: sprints.name, status: sprints.status })
    .from(sprints)
    .where(eq(sprints.projectId, id))
    .orderBy(asc(sprints.startDate), asc(sprints.createdAt));

  const serializedTasks = backlogTasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() || null,
    estimate: t.estimate ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center text-slate-900 text-xl flex-shrink-0"
          style={{ backgroundColor: project.color || "#6366f1" }}
        >
          📁
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Project backlog — unassigned sprint work ({serializedTasks.length} items)
          </p>
        </div>
      </div>

      <ProjectNav projectId={id} />

      <ProjectBacklogClient
        projectId={id}
        initialTasks={serializedTasks}
        sprints={sprintRows}
      />
    </div>
  );
}
