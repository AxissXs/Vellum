import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { getTeamVisibleProjectIds, buildProjectVisibilityCondition } from "@/lib/project-visibility";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamVisibleIds = await getTeamVisibleProjectIds(user.id);

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      taskCount: sql<number>`count(${tasks.id})::int`,
    })
    .from(projects)
    .leftJoin(tasks, and(eq(tasks.projectId, projects.id), isNull(tasks.deletedAt)))
    .where(
      and(
        isNull(projects.deletedAt),
        eq(projects.archived, false),
        buildProjectVisibilityCondition(user.id, teamVisibleIds)
      )
    )
    .groupBy(projects.id, projects.name, projects.description, projects.status);

  return NextResponse.json({ projects: rows });
}
