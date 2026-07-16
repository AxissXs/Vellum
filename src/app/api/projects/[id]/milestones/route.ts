import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectMilestones } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, asc, isNull, and } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const milestones = await db
    .select()
    .from(projectMilestones)
    .where(and(eq(projectMilestones.projectId, id), isNull(projectMilestones.deletedAt)))
    .orderBy(asc(projectMilestones.dueDate), asc(projectMilestones.createdAt));

  return NextResponse.json({ milestones });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, dueDate, ownerId } = body;

  if (!title) {
    return NextResponse.json({ error: "Milestone title is required" }, { status: 400 });
  }

  const [milestone] = await db
    .insert(projectMilestones)
    .values({
      projectId: id,
      title,
      description: description || null,
      status: status || "planned",
      dueDate: dueDate ? new Date(dueDate) : null,
      ownerId: ownerId || null,
    })
    .returning();

  await writeActivityLog({
    userId: user.id,
    action: "created_milestone",
    entityType: "milestone",
    entityId: milestone.id,
    details: `Created milestone: ${milestone.title}`,
    ipAddress: getClientIP(req),
    snapshots: [{ tableName: "project_milestones", recordId: milestone.id, snapshot: milestone, snapshotType: "after" }],
  });

  return NextResponse.json({ milestone }, { status: 201 });
}
