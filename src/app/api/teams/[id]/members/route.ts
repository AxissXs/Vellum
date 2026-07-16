import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq, isNull } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { userId, projectId, teamRole, allocation, responsibilities } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, userId), isNull(teamMembers.deletedAt)))
    .limit(1);

  if (existing) {
    const [member] = await db
      .update(teamMembers)
      .set({
        projectId: projectId || null,
        teamRole: teamRole || existing.teamRole,
        allocation: allocation || existing.allocation,
        responsibilities: responsibilities ?? existing.responsibilities,
      })
      .where(eq(teamMembers.id, existing.id))
      .returning();
    return NextResponse.json({ member });
  }

  const [member] = await db
    .insert(teamMembers)
    .values({
      teamId: id,
      userId,
      projectId: projectId || null,
      teamRole: teamRole || "contributor",
      allocation: allocation || "100",
      responsibilities: responsibilities || null,
    })
    .returning();

  await writeActivityLog({
    userId: user.id,
    action: "created_team_member",
    entityType: "teamMember",
    entityId: member.id,
    details: `Added member to team`,
    ipAddress: getClientIP(req),
    snapshots: [{ tableName: "team_members", recordId: member.id, snapshot: member, snapshotType: "after" }],
  });

  return NextResponse.json({ member }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const url = new URL(req.url);
  const memberId = url.searchParams.get("memberId");

  if (!memberId) return NextResponse.json({ error: "memberId is required" }, { status: 400 });

  const [existing] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, id), eq(teamMembers.id, memberId), isNull(teamMembers.deletedAt))).limit(1);

  await db
    .update(teamMembers)
    .set({ deletedAt: new Date(), deletedBy: user.id })
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.id, memberId), isNull(teamMembers.deletedAt)));

  if (existing) {
    await writeActivityLog({
      userId: user.id,
      action: "deleted_team_member",
      entityType: "teamMember",
      entityId: memberId,
      details: `Removed member from team`,
      ipAddress: getClientIP(req),
      snapshots: [{ tableName: "team_members", recordId: existing.id, snapshot: existing, snapshotType: "before" }],
    });
  }

  return NextResponse.json({ success: true });
}
