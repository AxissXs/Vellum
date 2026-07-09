import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { comments, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const taskId = url.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      taskId: comments.taskId,
      authorId: comments.authorId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorName: users.name,
      authorAvatar: users.avatarUrl,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.taskId, taskId))
    .orderBy(asc(comments.createdAt));

  return NextResponse.json({ comments: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, taskId } = await req.json();
  if (!content || !taskId) {
    return NextResponse.json(
      { error: "Content and taskId are required" },
      { status: 400 }
    );
  }

  const [comment] = await db
    .insert(comments)
    .values({ content, taskId, authorId: user.id })
    .returning();

  // Also fetch author name
  const result = {
    ...comment,
    authorName: user.name,
    authorAvatar: user.avatarUrl,
  };

  return NextResponse.json({ comment: result }, { status: 201 });
}
