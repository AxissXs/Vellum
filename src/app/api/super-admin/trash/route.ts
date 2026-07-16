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
import { eq, isNotNull, sql, ilike, gte, lte, and } from "drizzle-orm";

const entityConfig: Record<
  string,
  {
    table: any;
    titleCol: any;
    typeLabel: string;
    extraSelect?: Record<string, any>;
  }
> = {
  task: {
    table: tasks,
    titleCol: tasks.title,
    typeLabel: "Task",
    extraSelect: { projectName: projects.name },
  },
  project: {
    table: projects,
    titleCol: projects.name,
    typeLabel: "Project",
  },
  comment: {
    table: comments,
    titleCol: sql`LEFT(${comments.content}, 100)`,
    typeLabel: "Comment",
  },
  team: {
    table: teams,
    titleCol: teams.name,
    typeLabel: "Team",
  },
  milestone: {
    table: projectMilestones,
    titleCol: projectMilestones.title,
    typeLabel: "Milestone",
  },
  note: {
    table: projectNotes,
    titleCol: projectNotes.title,
    typeLabel: "Note",
  },
  teamMember: {
    table: teamMembers,
    titleCol: sql`${users.name} || ' (team member)'`,
    typeLabel: "Team Member",
  },
};

export async function GET(req: NextRequest) {
  const user = await getSession();
  try {
    requireRole(user, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const typeFilter = url.searchParams.get("type");
  const search = url.searchParams.get("search") || "";
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  const deletedByFilter = url.searchParams.get("deletedBy");
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize") || "25"))
  );

  const typesToQuery = typeFilter
    ? [typeFilter].filter((t) => entityConfig[t])
    : Object.keys(entityConfig);

  // Query each type and collect results
  const allItems: Array<{
    type: string;
    id: string;
    title: string;
    deletedAt: string;
    deletedBy: { id: string; name: string; email: string } | null;
    extra?: Record<string, any>;
  }> = [];

  for (const type of typesToQuery) {
    const config = entityConfig[type];
    let query = db
      .select({
        id: config.table.id,
        title: config.titleCol,
        deletedAt: config.table.deletedAt,
        deletedById: config.table.deletedBy,
        ...config.extraSelect,
      })
      .from(config.table)
      .where(isNotNull(config.table.deletedAt))
      .as("sq");

    // For teamMembers we need a join to get the user name
    if (type === "teamMember") {
      const rows = await db
        .select({
          id: teamMembers.id,
          title: sql<string>`${users.name} || ' (team member)'`,
          deletedAt: teamMembers.deletedAt,
          deletedById: teamMembers.deletedBy,
        })
        .from(teamMembers)
        .leftJoin(users, eq(teamMembers.userId, users.id))
        .where(isNotNull(teamMembers.deletedAt));

      for (const row of rows) {
        allItems.push({
          type,
          id: row.id,
          title: row.title || "Untitled",
          deletedAt: row.deletedAt!.toISOString(),
          deletedBy: row.deletedById
            ? { id: row.deletedById, name: "", email: "" }
            : null,
        });
      }
      continue;
    }

    if (type === "task") {
      const rows = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          deletedAt: tasks.deletedAt,
          deletedById: tasks.deletedBy,
          projectName: projects.name,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(isNotNull(tasks.deletedAt));

      for (const row of rows) {
        allItems.push({
          type,
          id: row.id,
          title: row.title || "Untitled",
          deletedAt: row.deletedAt!.toISOString(),
          deletedBy: row.deletedById
            ? { id: row.deletedById, name: "", email: "" }
            : null,
          extra: { projectName: row.projectName },
        });
      }
      continue;
    }

    // Generic query for other types
    const rows = await db
      .select({
        id: config.table.id,
        title: config.titleCol,
        deletedAt: config.table.deletedAt,
        deletedById: config.table.deletedBy,
      })
      .from(config.table)
      .where(isNotNull(config.table.deletedAt));

    for (const row of rows) {
      allItems.push({
        type,
        id: row.id,
        title: (row as any).title || "Untitled",
        deletedAt: row.deletedAt!.toISOString(),
        deletedBy: row.deletedById
          ? { id: row.deletedById, name: "", email: "" }
          : null,
      });
    }
  }

  // Apply text search filter
  let filtered = allItems;
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((i) => i.title.toLowerCase().includes(q));
  }

  // Apply date range filter
  if (fromDate) {
    const from = new Date(fromDate);
    filtered = filtered.filter((i) => new Date(i.deletedAt) >= from);
  }
  if (toDate) {
    const to = new Date(toDate);
    filtered = filtered.filter((i) => new Date(i.deletedAt) <= to);
  }

  // Apply deletedBy filter
  if (deletedByFilter) {
    filtered = filtered.filter(
      (i) => i.deletedBy?.id === deletedByFilter
    );
  }

  // Sort by deletedAt descending
  filtered.sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  // Resolve deletedBy user names in batch
  const deletedByIds = [
    ...new Set(
      paginated.map((i) => i.deletedBy?.id).filter(Boolean) as string[]
    ),
  ];
  const deletedByMap = new Map<string, { name: string; email: string }>();
  if (deletedByIds.length > 0) {
    const userRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(sql`${users.id} = ANY(${deletedByIds})`);
    for (const u of userRows) {
      deletedByMap.set(u.id, u);
    }
  }

  const items = paginated.map((item) => ({
    ...item,
    deletedBy: item.deletedBy
      ? {
          ...item.deletedBy,
          name: deletedByMap.get(item.deletedBy.id)?.name || "Unknown",
          email: deletedByMap.get(item.deletedBy.id)?.email || "",
        }
      : null,
  }));

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages,
  });
}
