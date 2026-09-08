import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/hofs";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const GET = withAuth(async (_req, user) => {
  const rows = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      title: notifications.title,
      content: notifications.content,
      read: notifications.read,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
      url: notifications.url,
      actorUserId: notifications.actorUserId,
      actorName: users.name,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorUserId, users.id))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return NextResponse.json({ notifications: rows });
});
