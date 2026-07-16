import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
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
    .where(eq(projects.archived, false))
    .orderBy(asc(projects.createdAt));

  // Get task counts per project
  const taskCounts = await db
    .select({
      projectId: tasks.projectId,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
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
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeProjects.length} active project{activeProjects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ProjectListClient
          userRole={user?.role || "member"}
          currentUserId={user?.id || ""}
        />
      </div>

      {projectsWithCounts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <FolderKanban size={28} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No projects yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Create your first project to start organizing tasks and collaborating with your team.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsWithCounts.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-200 transition group"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-slate-900 text-xl shrink-0"
                  style={{ backgroundColor: project.color || "#6366f1" }}
                >
                  📁
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition truncate">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-slate-600">
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
