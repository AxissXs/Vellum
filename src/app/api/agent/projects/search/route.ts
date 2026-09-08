import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { and, isNull, or, ilike } from "drizzle-orm";
import { getTeamVisibleProjectIds, buildProjectVisibilityCondition } from "@/lib/project-visibility";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "Search query must be at least 2 characters" }, { status: 400 });
  }

  const pattern = `%${q.trim()}%`;
  const teamVisibleIds = await getTeamVisibleProjectIds(user.id);

  const rows = await db
    .select()
    .from(projects)
    .where(
      and(
        isNull(projects.deletedAt),
        buildProjectVisibilityCondition(user.id, teamVisibleIds),
        or(ilike(projects.name, pattern), ilike(projects.description, pattern))
      )
    )
    .limit(limit);

  return NextResponse.json({ projects: rows });
}
