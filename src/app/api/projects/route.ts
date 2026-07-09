import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, activityLogs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const archived = url.searchParams.get("archived") === "true";

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.archived, archived))
    .orderBy(asc(projects.createdAt));

  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  await db.insert(activityLogs).values({
    userId: user.id,
    action: "created_project",
    entityType: "project",
    entityId: project.id,
    details: `Created project: ${project.name}`,
  });

  return NextResponse.json({ project }, { status: 201 });
}
