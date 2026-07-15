import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { retroItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sprintId = req.nextUrl.searchParams.get("sprintId");
  if (!sprintId) {
    return NextResponse.json({ error: "sprintId is required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(retroItems)
    .where(eq(retroItems.sprintId, sprintId))
    .orderBy(asc(retroItems.createdAt));

  return NextResponse.json({ retroItems: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { sprintId, category, content } = body;

  if (!sprintId || !category || !content) {
    return NextResponse.json(
      { error: "sprintId, category, and content are required" },
      { status: 400 }
    );
  }

  const validCategories = ["went_well", "went_wrong", "action_item"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const [item] = await db
    .insert(retroItems)
    .values({
      sprintId,
      authorId: user.id,
      category,
      content,
    })
    .returning();

  logActivity({
    userId: user.id,
    action: "created_retro_item",
    entityType: "retro",
    entityId: item.id,
    details: `Added retro item (${category})`,
  });

  return NextResponse.json({ retroItem: item }, { status: 201 });
}
