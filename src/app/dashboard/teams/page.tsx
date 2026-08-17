import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { teams, teamMembers, users } from "@/db/schema";
import { eq, asc, isNull, and } from "drizzle-orm";
import TeamManagementClient from "./TeamManagementClient";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const currentUser = await getSession();
  const teamRows = await db.select().from(teams).where(isNull(teams.deletedAt)).orderBy(asc(teams.name));

  const teamsWithMembers = await Promise.all(
    teamRows.map(async (team) => {
      const members = await db
        .select({
          membershipId: teamMembers.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          avatarUrl: users.avatarUrl,
          teamRole: teamMembers.teamRole,
          allocation: teamMembers.allocation,
          responsibilities: teamMembers.responsibilities,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(and(eq(teamMembers.teamId, team.id), isNull(teamMembers.deletedAt)));

      return {
        ...team,
        lead: members.find((member) => member.teamRole === "lead") || null,
        members,
        memberCount: members.length,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      };
    })
  );

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .orderBy(asc(users.name));

  const canManage = currentUser?.role === "superadmin" || currentUser?.role === "admin";
  const canDelete = currentUser?.role === "superadmin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Teams</h1>
        <p className="text-text-dim text-sm mt-1">
          Manage team structure, leads, allocations, and responsibilities.
        </p>
      </div>

      <TeamManagementClient
        initialTeams={JSON.parse(JSON.stringify(teamsWithMembers))}
        users={userRows}
        canManage={canManage}
        canDelete={canDelete}
      />
    </div>
  );
}
