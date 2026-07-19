import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks, users, projectMilestones } from "@/db/schema";
import { eq, asc, isNull, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import ProjectDetailClient from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const [taskRows, allUsers, milestoneRows, allProjects] = await Promise.all([
    db
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
      .where(and(eq(tasks.projectId, id), isNull(tasks.deletedAt)))
      .orderBy(tasks.position, tasks.createdAt),
    db
      .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .orderBy(users.name),
    db
      .select()
      .from(projectMilestones)
      .where(and(eq(projectMilestones.projectId, id), isNull(projectMilestones.deletedAt)))
      .orderBy(asc(projectMilestones.dueDate), asc(projectMilestones.createdAt)),
    db
      .select({ id: projects.id, name: projects.name, color: projects.color })
      .from(projects)
      .where(and(eq(projects.archived, false), isNull(projects.deletedAt)))
      .orderBy(asc(projects.createdAt)),
  ]);

  const serializedTasks = taskRows.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() || null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const serializedProject = {
    ...project,
    startDate: project.startDate?.toISOString() || null,
    targetDate: project.targetDate?.toISOString() || null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };

  const serializedMilestones = milestoneRows.map((milestone) => ({
    ...milestone,
    dueDate: milestone.dueDate?.toISOString() || null,
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center text-slate-900 text-xl shrink-0"
          style={{ backgroundColor: project.color || "#6366f1" }}
        >
          📁
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500">
              {project.status}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500">
              {project.health.replace("_", " ")}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-slate-500 mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      <ProjectDetailClient
        project={serializedProject}
        initialTasks={serializedTasks}
        initialMilestones={serializedMilestones}
        users={allUsers}
        allProjects={allProjects}
        currentUserId={user?.id || ""}
        userRole={user?.role || "member"}
        canEdit={hasPermission(user?.role, "edit_projects")}
        canDelete={hasPermission(user?.role, "delete_projects")}
      />
    </div>
  );
}
