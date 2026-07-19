import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { hasPermission } from "@/lib/permissions";
import { eq, and, asc, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const archived = url.searchParams.get("archived") === "true";

  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.archived, archived), isNull(projects.deletedAt)))
    .orderBy(asc(projects.createdAt));

  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "create_projects")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, color, icon } = body;

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const [project] = await db
    .insert(projects)
    .values({
      name,
      description: description || null,
      color: color || "#6366f1",
      icon: icon || "folder",
      ownerId: user.id,
    })
    .returning();

  logActivity({
    userId: user.id,
    action: "created_project",
    entityType: "project",
    entityId: project.id,
    details: `Created project: ${project.name}`,
  });

  return NextResponse.json({ project }, { status: 201 });
}
