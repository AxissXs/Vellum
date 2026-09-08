import { db } from "@/db";
import { projects, projectTeams, teamMembers } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

type Project = typeof projects.$inferSelect;

/**
 * Check if a user can access a project based on visibility rules.
 * - "company": visible to all authenticated users
 * - "team": visible to project owner + members of linked teams
 * - "private": visible only to project owner
 */
export async function canAccessProject(
  userId: string,
  project: Project
): Promise<boolean> {
  if (project.visibility === "company") return true;
  if (project.ownerId === userId) return true;

  if (project.visibility === "team") {
    const projectTeamRows = await db
      .select({ teamId: projectTeams.teamId })
      .from(projectTeams)
      .where(eq(projectTeams.projectId, project.id));

    if (projectTeamRows.length === 0) return false;

    const teamIds = projectTeamRows.map((r) => r.teamId);
    const membership = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          inArray(teamMembers.teamId, teamIds),
          isNull(teamMembers.deletedAt)
        )
      )
      .limit(1);

    return membership.length > 0;
  }

  return false;
}

/**
 * Fetch a project by ID and check access.
 * Returns null if not found or access denied.
 */
export async function getAccessibleProject(
  userId: string,
  projectId: string
): Promise<Project | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) return null;

  const access = await canAccessProject(userId, project);
  return access ? project : null;
}
