import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sprints } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { hasPermission } from "@/lib/permissions";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(sprints)
    .where(eq(sprints.projectId, projectId))
    .orderBy(asc(sprints.startDate), asc(sprints.createdAt));

  return NextResponse.json({ sprints: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "create_sprints")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { projectId, name, goal, startDate, endDate, status } = body;

  if (!projectId || !name) {
    return NextResponse.json({ error: "projectId and name are required" }, { status: 400 });
  }

  const [sprint] = await db
    .insert(sprints)
    .values({
      projectId,
      name,
      goal: goal || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: status || "planned",
    })
    .returning();

  logActivity({
    userId: user.id,
    action: "created_sprint",
    entityType: "sprint",
    entityId: sprint.id,
    details: `Created sprint: ${sprint.name}`,
  });

  return NextResponse.json({ sprint }, { status: 201 });
}
