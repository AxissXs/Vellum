import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { desc, gte, lte, sql, eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "csv";
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const ip = searchParams.get("ip");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions = [];
  if (userId) conditions.push(eq(activityLogs.userId, userId));
  if (action) conditions.push(sql`${activityLogs.action} ILIKE ${`%${action}%`}`);
  if (ip) conditions.push(sql`${activityLogs.ipAddress} ILIKE ${`%${ip}%`}`);
  if (from) conditions.push(gte(activityLogs.createdAt, new Date(from)));
  if (to) conditions.push(lte(activityLogs.createdAt, new Date(to)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      userName: users.name,
      userEmail: users.email,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      ipAddress: activityLogs.ipAddress,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .leftJoin(users, sql`${users.id} = ${activityLogs.userId}`)
    .where(whereClause)
    .orderBy(desc(activityLogs.createdAt));

  if (format === "csv") {
    const headers = ["ID", "User", "Email", "Action", "Entity", "Details", "IP", "Created At"];
    const lines = rows.map((r) => [
      r.id,
      r.userName ?? "System",
      r.userEmail ?? "",
      r.action,
      `${r.entityType}${r.entityId ? `:${r.entityId}` : ""}`,
      `"${(r.details ?? "").replace(/"/g, "\"\"")}"`,
      r.ipAddress ?? "",
      new Date(r.createdAt).toISOString(),
    ].join(","));

    const csv = [headers.join(","), ...lines].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
