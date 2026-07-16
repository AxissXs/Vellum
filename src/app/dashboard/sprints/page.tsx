import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import SprintsClient from "./SprintsClient";

export const dynamic = "force-dynamic";

export default async function SprintsPage() {
  const user = await getSession();

  const projectRows = await db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(eq(projects.archived, false))
    .orderBy(asc(projects.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sprints</h1>
        <p className="text-sm text-slate-500 mt-1">
          Time-boxed iterations with boards, burndown, standups, and retros.
        </p>
      </div>

      <SprintsClient projects={projectRows} userRole={user?.role || "member"} />
    </div>
  );
}
