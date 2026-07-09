import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { teams, teamMembers, users, projects } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(teams).orderBy(asc(teams.name));

  const teamsWithCounts = await Promise.all(
    rows.map(async (team) => {
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
        .where(eq(teamMembers.teamId, team.id));

      const lead = team.leadId
        ? members.find((member) => member.userId === team.leadId) || null
        : null;

      return { ...team, lead, members, memberCount: members.length };
    })
  );

  return NextResponse.json({ teams: teamsWithCounts });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, focus, leadId } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  }

  const [team] = await db
    .insert(teams)
    .values({
      name,
      description: description || null,
      focus: focus || null,
      leadId: leadId || null,
    })
    .returning();

  return NextResponse.json({ team }, { status: 201 });
}
