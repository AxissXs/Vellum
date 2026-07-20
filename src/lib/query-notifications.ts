import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";

export async function queryNotificationsForUser(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
) {
  const conditions = [eq(notifications.userId, userId)];
  if (options.unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }

  return db
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
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(options.limit ?? 10);
}

export async function markNotificationRead(user: AuthUser, notificationId: string) {
  const [row] = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, user.id))
    )
    .returning();
  return row ?? null;
}

export async function markAllNotificationsRead(user: AuthUser) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, user.id));
}
