import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, teamMembers, projectTeams } from "@/db/schema";
import { eq, and, asc, isNull, or, inArray } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const archived = url.searchParams.get("archived") === "true";

  const userTeamRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id));
  const userTeamIds = userTeamRows.map((r) => r.teamId);

  const teamVisibleRows = userTeamIds.length > 0
    ? await db
        .select({ projectId: projectTeams.projectId })
        .from(projectTeams)
        .where(inArray(projectTeams.teamId, userTeamIds))
    : [];
  const teamVisibleIds = teamVisibleRows.map((r) => r.projectId);

  const rows = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.archived, archived),
        isNull(projects.deletedAt),
        or(
          eq(projects.visibility, "company"),
          eq(projects.ownerId, user.id),
          and(
            eq(projects.visibility, "team"),
            inArray(projects.id, teamVisibleIds)
          )
        )
      )
    )
    .orderBy(asc(projects.createdAt));

  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, color, icon, visibility, teamIds } = body;

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const [project] = await db
    .insert(projects)
    .values({
      name,
      description: description || null,
      color: color || "#6366f1",
      icon: icon || "folder",
      visibility: visibility || "team",
      ownerId: user.id,
    })
    .returning();

  if (Array.isArray(teamIds) && teamIds.length > 0) {
    await db.insert(projectTeams).values(
      teamIds.map((teamId: string) => ({ projectId: project.id, teamId }))
    );
  }

  await writeActivityLog({
    userId: user.id,
    action: "created_project",
    entityType: "project",
    entityId: project.id,
    details: `Created project: ${project.name}`,
    ipAddress: getClientIP(req),
    snapshots: [{ tableName: "projects", recordId: project.id, snapshot: project, snapshotType: "after" }],
  });

  return NextResponse.json({ project }, { status: 201 });
}
