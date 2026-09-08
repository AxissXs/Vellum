import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/hofs";
import { db } from "@/db";
import { projectMilestones } from "@/db/schema";
import { eq, asc, isNull, and } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";
import { getAccessibleProject } from "@/lib/project-access";

export const GET = withAuth(
  async (req, user, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const project = await getAccessibleProject(user.id, id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const milestones = await db
      .select()
      .from(projectMilestones)
      .where(and(eq(projectMilestones.projectId, id), isNull(projectMilestones.deletedAt)))
      .orderBy(asc(projectMilestones.dueDate), asc(projectMilestones.createdAt));

    return NextResponse.json({ milestones });
  }
);

export const POST = withAuth(
  async (req, user, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const project = await getAccessibleProject(user.id, id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

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
);
