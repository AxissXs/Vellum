import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/hofs";
import { db } from "@/db";
import { tasks, users, projects } from "@/db/schema";
import { eq, and, asc, isNull, or, ilike } from "drizzle-orm";
import { getTeamVisibleProjectIds, buildProjectVisibilityCondition } from "@/lib/project-visibility";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const projectId = url.searchParams.get("projectId");
  const status = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "Search query must be at least 2 characters" }, { status: 400 });
  }

  const pattern = `%${q.trim()}%`;
  const teamVisibleIds = await getTeamVisibleProjectIds(user.id);

  const conditions = [
    isNull(tasks.deletedAt),
    buildProjectVisibilityCondition(user.id, teamVisibleIds),
    or(ilike(tasks.title, pattern), ilike(tasks.description, pattern)),
  ];

  if (projectId) conditions.push(eq(tasks.projectId, projectId));
  if (status) conditions.push(eq(tasks.status, status as any));

  const rows = await db
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
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.position), asc(tasks.createdAt))
    .limit(limit);

  return NextResponse.json({ tasks: rows });
});
