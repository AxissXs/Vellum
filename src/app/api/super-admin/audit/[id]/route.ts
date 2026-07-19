import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import {
  activityLogs,
  activityLogSnapshots,
  users,
  userSessions,
  tasks,
  projects,
  comments,
  teams,
  teamMembers,
  projectMilestones,
} from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const entityTableMap: Record<string, any> = {
  task: tasks,
  project: projects,
  comment: comments,
  team: teams,
  team_member: teamMembers,
  milestone: projectMilestones,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [log] = await db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      userName: users.name,
      userEmail: users.email,
      userAvatar: users.avatarUrl,
      userRole: users.role,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      ipAddress: activityLogs.ipAddress,
      tag: activityLogs.tag,
      severity: activityLogs.severity,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .leftJoin(users, sql`${users.id} = ${activityLogs.userId}`)
    .where(eq(activityLogs.id, id))
    .limit(1);

  if (!log) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  const snapshots = await db
    .select()
    .from(activityLogSnapshots)
    .where(eq(activityLogSnapshots.logId, id))
    .orderBy(desc(activityLogSnapshots.createdAt));

  const parsedSnapshots = snapshots.map((s) => ({
    ...s,
    snapshot: JSON.parse(s.snapshot) as Record<string, unknown>,
  }));

  let lastLoginAt: string | null = null;
  let lastIp: string | null = null;
  if (log.userId) {
    const [session] = await db
      .select({
        createdAt: userSessions.createdAt,
        ipAddress: userSessions.ipAddress,
      })
      .from(userSessions)
      .where(eq(userSessions.userId, log.userId))
      .orderBy(desc(userSessions.createdAt))
      .limit(1);
    if (session) {
      lastLoginAt = session.createdAt.toISOString();
      lastIp = session.ipAddress;
    }
  }

  let entityCurrent: Record<string, unknown> | null = null;
  let entityExists = false;
  if (log.entityId && log.entityType) {
    const tableName =
      log.entityType === "team_member" ? "team_member" : log.entityType;
    const table = entityTableMap[tableName] || entityTableMap[log.entityType];
    if (table) {
      try {
        const [row] = await db
          .select()
          .from(table)
          .where(eq(table.id, log.entityId))
          .limit(1);
        if (row) {
          entityExists = true;
          entityCurrent = row as Record<string, unknown>;
        }
      } catch {
        // entity type not in map or query failed
      }
    }
  }

  let entityTimeline: Array<{
    id: string;
    action: string;
    userName: string | null;
    details: string | null;
    severity: string;
    createdAt: Date;
  }> = [];
  if (log.entityId && log.entityType) {
    const timelineRows = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        userName: users.name,
        details: activityLogs.details,
        severity: activityLogs.severity,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .leftJoin(users, sql`${users.id} = ${activityLogs.userId}`)
      .where(
        sql`${activityLogs.entityType} = ${log.entityType} AND ${activityLogs.entityId} = ${log.entityId}`
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(20);

    entityTimeline = timelineRows as typeof entityTimeline;
  }

  return NextResponse.json({
    log: {
      ...log,
      createdAt: log.createdAt.toISOString(),
    },
    snapshots: parsedSnapshots,
    actor: {
      id: log.userId,
      name: log.userName,
      email: log.userEmail,
      role: log.userRole,
      avatarUrl: log.userAvatar,
      lastLoginAt,
      lastIp,
    },
    entity: {
      exists: entityExists,
      current: entityCurrent,
    },
    timeline: entityTimeline.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}
