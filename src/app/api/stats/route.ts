import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks, teams, users, teamMembers } from "@/db/schema";
import { eq, sql, isNull, and, or, ne, inArray } from "drizzle-orm";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userTeamRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id));
  const userTeamIds = userTeamRows.map((r) => r.teamId);

  const [projectCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(
      and(
        eq(projects.archived, false),
        isNull(projects.deletedAt),
        or(
          ne(projects.visibility, "private"),
          eq(projects.ownerId, user.id),
          and(
            eq(projects.visibility, "team"),
            inArray(projects.teamId, userTeamIds)
          )
        )
      )
    );

  const [taskCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(isNull(tasks.deletedAt));

  const [doneCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.status, "done"), isNull(tasks.deletedAt)));

  const [teamCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(teams)
    .where(isNull(teams.deletedAt));

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  const statusBreakdown = await db
    .select({
      status: tasks.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(isNull(tasks.deletedAt))
    .groupBy(tasks.status);

  const priorityBreakdown = await db
    .select({
      priority: tasks.priority,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(isNull(tasks.deletedAt))
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
