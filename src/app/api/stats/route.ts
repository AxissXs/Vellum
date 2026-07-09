import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks, teams, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [projectCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.archived, false));

  const [taskCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks);

  const [doneCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(eq(tasks.status, "done"));

  const [teamCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(teams);

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  const statusBreakdown = await db
    .select({
      status: tasks.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .groupBy(tasks.status);

  const priorityBreakdown = await db
    .select({
      priority: tasks.priority,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .groupBy(tasks.priority);

  return NextResponse.json({
    stats: {
      projects: projectCount.count,
      tasks: taskCount.count,
      doneTasks: doneCount.count,
      teams: teamCount.count,
      users: userCount.count,
      completionRate: taskCount.count > 0 ? Math.round((doneCount.count / taskCount.count) * 100) : 0,
      statusBreakdown,
      priorityBreakdown,
    },
  });
}
