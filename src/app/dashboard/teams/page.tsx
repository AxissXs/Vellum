import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { teams, teamMembers, users, projects } from "@/db/schema";
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
          projectId: teamMembers.projectId,
          projectName: projects.name,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .leftJoin(projects, eq(teamMembers.projectId, projects.id))
        .where(and(eq(teamMembers.teamId, team.id), isNull(teamMembers.deletedAt)));

      return {
        ...team,
        lead: team.leadId ? members.find((member) => member.userId === team.leadId) || null : null,
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

  const projectRows = await db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(and(eq(projects.archived, false), isNull(projects.deletedAt)))
    .orderBy(asc(projects.name));

  const canManage = currentUser?.role === "superadmin" || currentUser?.role === "admin";
  const canDelete = currentUser?.role === "superadmin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Teams</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage team structure, leads, allocations, responsibilities, and project assignments.
        </p>
      </div>

      <TeamManagementClient
        initialTeams={JSON.parse(JSON.stringify(teamsWithMembers))}
        users={userRows}
        projects={projectRows}
        canManage={canManage}
        canDelete={canDelete}
      />
    </div>
  );
}
