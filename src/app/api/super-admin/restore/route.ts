import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import {
  tasks,
  projects,
  comments,
  teams,
  projectMilestones,
  projectNotes,
  teamMembers,
  users,
} from "@/db/schema";
import { eq, isNull, and, isNotNull } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";

const entityTables: Record<string, any> = {
  task: tasks,
  project: projects,
  comment: comments,
  team: teams,
  milestone: projectMilestones,
  note: projectNotes,
  teamMember: teamMembers,
};

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  try {
    requireRole(user, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const entities = body.entities as Array<{ type: string; id: string }>;

  if (!Array.isArray(entities) || entities.length === 0) {
    return NextResponse.json(
      { error: "entities array is required" },
      { status: 400 }
    );
  }

  let restored = 0;

  for (const entity of entities) {
    const table = entityTables[entity.type];
    if (!table) continue;

    await db
      .update(table)
      .set({ deletedAt: null, deletedBy: null })
      .where(and(eq(table.id, entity.id), isNotNull(table.deletedAt)));

    // Fetch title/name for audit log
    let title = "";
    try {
      const [row] = await db
        .select()
        .from(table)
        .where(eq(table.id, entity.id))
        .limit(1);
      if (row) {
        title =
          (row as any).title || (row as any).name || (row as any).content || "";
      }
    } catch {
      // ignore
    }

    // Log restoration
    const action = `restored_${entity.type}`;
    await writeActivityLog({
      userId: user.id,
      action,
      entityType: entity.type,
      entityId: entity.id,
      details: `Restored ${entity.type}: ${title || entity.id}`,
      ipAddress: getClientIP(req),
    });

    restored++;
  }

  return NextResponse.json({ restored });
}
