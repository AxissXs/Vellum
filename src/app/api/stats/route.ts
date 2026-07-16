import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks, teams, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    [projectCount],
    [taskCount],
    [doneCount],
    [teamCount],
    [userCount],
    statusBreakdown,
    priorityBreakdown,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.archived, false)),
    db.select({ count: sql<number>`count(*)::int` }).from(tasks),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.status, "done")),
    db.select({ count: sql<number>`count(*)::int` }).from(teams),
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db
      .select({
        status: tasks.status,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .groupBy(tasks.status),
    db
      .select({
        priority: tasks.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .groupBy(tasks.priority),
  ]);

  return NextResponse.json({
    stats: {
      projects: projectCount.count,
      tasks: taskCount.count,
      doneTasks: doneCount.count,
      teams: teamCount.count,
      users: userCount.count,
      completionRate:
        taskCount.count > 0
          ? Math.round((doneCount.count / taskCount.count) * 100)
          : 0,
      statusBreakdown,
      priorityBreakdown,
    },
  });
}
