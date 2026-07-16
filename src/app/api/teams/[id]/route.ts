import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, isNull, and } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, description, focus, leadId } = body;

  const [before] = await db.select().from(teams).where(and(eq(teams.id, id), isNull(teams.deletedAt))).limit(1);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (focus !== undefined) updateData.focus = focus;
  if (leadId !== undefined) updateData.leadId = leadId || null;

  const [team] = await db
    .update(teams)
    .set(updateData)
    .where(eq(teams.id, id))
    .returning();

  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await writeActivityLog({
    userId: user.id,
    action: "updated_team",
    entityType: "team",
    entityId: team.id,
    details: `Updated team: ${team.name}`,
    ipAddress: getClientIP(req),
    snapshots: [
      ...(before ? [{ tableName: "teams" as const, recordId: team.id, snapshot: before, snapshotType: "before" as const }] : []),
      { tableName: "teams", recordId: team.id, snapshot: team, snapshotType: "after" },
    ],
  });

  return NextResponse.json({ team });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [team] = await db.select().from(teams).where(and(eq(teams.id, id), isNull(teams.deletedAt))).limit(1);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  await db
    .update(teams)
    .set({ deletedAt: new Date(), deletedBy: user.id })
    .where(eq(teams.id, id));

  // Also soft-delete all team members
  const { teamMembers } = await import("@/db/schema");
  await db
    .update(teamMembers)
    .set({ deletedAt: new Date(), deletedBy: user.id })
    .where(eq(teamMembers.teamId, id));

  await writeActivityLog({
    userId: user.id,
    action: "deleted_team",
    entityType: "team",
    entityId: id,
    details: `Soft-deleted team: ${team.name}`,
    ipAddress: getClientIP(req),
    snapshots: [{ tableName: "teams", recordId: team.id, snapshot: team, snapshotType: "before" }],
  });

  return NextResponse.json({ success: true });
}
