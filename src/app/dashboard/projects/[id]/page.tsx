import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks, users, projectMilestones } from "@/db/schema";
import { eq, asc, isNull, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import KanbanBoard from "./KanbanBoard";
import ProjectManagementPanel from "./ProjectManagementPanel";

export const dynamic = "force-dynamic";

const statusColumns = [
  { key: "backlog", label: "Backlog", color: "bg-slate-500" },
  { key: "todo", label: "To Do", color: "bg-blue-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { key: "review", label: "Review", color: "bg-purple-500" },
  { key: "done", label: "Done", color: "bg-emerald-500" },
];

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
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(eq(tasks.projectId, id), isNull(tasks.deletedAt)))
    .orderBy(tasks.position, tasks.createdAt);

  const allUsers = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .orderBy(users.name);

  const milestoneRows = await db
    .select()
    .from(projectMilestones)
    .where(and(eq(projectMilestones.projectId, id), isNull(projectMilestones.deletedAt)))
    .orderBy(asc(projectMilestones.dueDate), asc(projectMilestones.createdAt));

  const doneTasks = taskRows.filter((task) => task.status === "done").length;
  const completionRate = taskRows.length > 0 ? Math.round((doneTasks / taskRows.length) * 100) : 0;

  const memberMap = new Map<string, { userId: string | null; name: string | null; openTasks: number; doneTasks: number }>();
  for (const task of taskRows) {
    const key = task.assigneeId || "unassigned";
    const current = memberMap.get(key) || {
      userId: task.assigneeId,
      name: task.assigneeName || "Unassigned",
      openTasks: 0,
      doneTasks: 0,
    };
    if (task.status === "done") current.doneTasks += 1;
    else current.openTasks += 1;
    memberMap.set(key, current);
  }

  const allProjects = await db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(and(eq(projects.archived, false), isNull(projects.deletedAt)))
    .orderBy(asc(projects.createdAt));

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
          className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0"
          style={{ backgroundColor: project.color || "#6366f1" }}
        >
          📁
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
              {project.status}
            </span>
            <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
              {project.health.replace("_", " ")}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-slate-400 mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      <ProjectManagementPanel
        project={serializedProject}
        initialMilestones={serializedMilestones}
        users={allUsers}
        members={Array.from(memberMap.values())}
        completionRate={completionRate}
      />

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Delivery Board</h2>
          <p className="text-sm text-slate-500">Plan and move execution work across your workflow.</p>
        </div>
        <KanbanBoard
          projectId={project.id}
          initialColumns={columns}
          users={allUsers}
          allProjects={allProjects}
          currentUserId={user?.id || ""}
        />
      </div>
    </div>
  );
}
