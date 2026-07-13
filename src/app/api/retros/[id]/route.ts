import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { retroItems, activityLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { category, content } = body;

  const [existing] = await db.select().from(retroItems).where(eq(retroItems.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Retro item not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (category !== undefined) updateData.category = category;
  if (content !== undefined) updateData.content = content;

  const [item] = await db.update(retroItems).set(updateData).where(eq(retroItems.id, id)).returning();

  await db.insert(activityLogs).values({
    userId: user.id,
    action: "updated_retro_item",
    entityType: "retro",
    entityId: id,
    details: "Updated retro item",
  });

  return NextResponse.json({ retroItem: item });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [existing] = await db.select().from(retroItems).where(eq(retroItems.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Retro item not found" }, { status: 404 });
  }

  await db.delete(retroItems).where(eq(retroItems.id, id));

  await db.insert(activityLogs).values({
    userId: user.id,
    action: "deleted_retro_item",
    entityType: "retro",
    entityId: id,
    details: "Deleted retro item",
  });

  return NextResponse.json({ success: true });
}
