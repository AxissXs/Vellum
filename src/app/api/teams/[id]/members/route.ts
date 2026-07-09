import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

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
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, userId)))
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

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.id, memberId)));

  return NextResponse.json({ success: true });
}
