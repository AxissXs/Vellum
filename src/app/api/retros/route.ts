import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { retroItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { createRetroItemForUser, type RetroCategory } from "@/lib/create-retro-item";

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

  try {
    const item = await createRetroItemForUser(
      user,
      sprintId,
      category as RetroCategory,
      content
    );
    return NextResponse.json({ retroItem: item }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid retro item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
