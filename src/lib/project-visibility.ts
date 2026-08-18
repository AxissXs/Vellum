import { db } from "@/db";
import { projects, teamMembers, projectTeams } from "@/db/schema";
import { eq, and, isNull, or, inArray, SQL } from "drizzle-orm";

/**
 * Fetches the IDs of projects visible to a user via team membership.
 * Returns a Set for O(1) lookup.
 */
export async function getTeamVisibleProjectIds(userId: string): Promise<Set<string>> {
  const userTeamRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  if (userTeamRows.length === 0) return new Set();

  const userTeamIds = userTeamRows.map((r) => r.teamId);

  const rows = await db
    .select({ projectId: projectTeams.projectId })
    .from(projectTeams)
    .where(inArray(projectTeams.teamId, userTeamIds));

  return new Set(rows.map((r) => r.projectId));
}

/**
 * Builds a SQL condition that checks if a project is visible to a user.
 *
 * Rules:
 * - "company" → visible to everyone
 * - "private" → visible only to owner
 * - "team" → visible only if user is in at least one of the project's teams
 */
export function buildProjectVisibilityCondition(
  userId: string,
  teamVisibleIds: Set<string>
): SQL {
  const conditions: SQL[] = [
    eq(projects.visibility, "company"),
    eq(projects.ownerId, userId),
  ];

  if (teamVisibleIds.size > 0) {
    conditions.push(
      and(
        eq(projects.visibility, "team"),
        inArray(projects.id, [...teamVisibleIds])
      )!
    );
  }

  // When teamVisibleIds is empty, team-scoped projects are not visible (no condition added)

  return or(...conditions)!;
}
