import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCommentForUser, queryCommentsForTask } from "@/lib/create-comment";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const taskId = url.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const rows = await queryCommentsForTask(taskId);

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

  const result = await createCommentForUser(user, taskId, content);

  return NextResponse.json({ comment: result }, { status: 201 });
}
