import { db } from "@/db";
import { notifications, notificationPreferences } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { pusher } from "@/lib/pusher";

export async function isInAppEnabled(
  userId: string,
  eventType: string
): Promise<boolean> {
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.eventType, eventType as any)
      )
    )
    .limit(1);

  if (prefs.length === 0) return true;
  return prefs[0].inAppEnabled;
}

export async function sendInAppNotification({
  userId,
  type,
  title,
  content,
  entityType,
  entityId,
  actorUserId,
}: {
  userId: string;
  type: string;
  title: string;
  content: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
}) {
  if (!userId) return;

  const enabled = await isInAppEnabled(userId, type);
  if (!enabled) return;

  const [notification] = await db
    .insert(notifications)
    .values({
      userId,
      type: type as any,
      title,
      content,
      read: false,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      actorUserId: actorUserId ?? null,
    })
    .returning();

  // Broadcast real-time badge increment
  try {
    await pusher.trigger(`user-${userId}`, "notification", {
      notification,
      unreadIncrement: 1,
    });
  } catch (_e) {
    // Swallow Pusher errors
  }
}
