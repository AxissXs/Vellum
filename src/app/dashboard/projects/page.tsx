import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { eq, sql, asc, isNull, and } from "drizzle-orm";
import Link from "next/link";
import { Plus, Archive, FolderKanban } from "lucide-react";
import { clsx } from "clsx";
import ProjectListClient from "./ProjectListClient";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getSession();

  const activeProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.archived, false), isNull(projects.deletedAt)))
    .orderBy(asc(projects.createdAt));

  // Get task counts per project (exclude soft-deleted tasks)
  const taskCounts = await db
    .select({
      projectId: tasks.projectId,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(isNull(tasks.deletedAt))
    .groupBy(tasks.projectId);

  const countMap = new Map(taskCounts.map((t) => [t.projectId, t.count]));

  const projectsWithCounts = activeProjects.map((p) => ({
    ...p,
    taskCount: countMap.get(p.id) || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
          <p className="text-text-dim text-sm mt-1">
            {activeProjects.length} active project{activeProjects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ProjectListClient userRole={user?.role || "member"} />
      </div>

      {projectsWithCounts.length === 0 ? (
        <div className="bg-surface-card border border-border-subtle rounded-2xl p-12 text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-surface-strong flex items-center justify-center">
            <FolderKanban size={28} className="text-text-dim" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No projects yet</h3>
          <p className="text-sm text-text-dim max-w-sm mx-auto">
            Create your first project to start organizing tasks and collaborating with your team.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsWithCounts.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="bg-surface-card border border-border-subtle rounded-xl p-5 hover:border-border-default transition group"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-text-primary text-xl flex-shrink-0"
                  style={{ backgroundColor: project.color || "#6366f1" }}
                >
                  📁
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text-primary group-hover:text-brand-400 transition truncate">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-text-dim mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-text-dim">
                      {project.taskCount} task{project.taskCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
