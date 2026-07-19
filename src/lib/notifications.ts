import { db } from "@/db";
import { notifications, notificationPreferences } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { pusher } from "@/lib/pusher";
import { sendPushNotification, isPushEnabled } from "@/lib/push";
import { sendTelegramNotification, broadcastToSupergroup, maybeBroadcastToChannel } from "@/lib/telegram";

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
  url,
}: {
  userId: string;
  type: string;
  title: string;
  content: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  url?: string;
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
      url: url ?? null,
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

/**
 * Send a notification to a specific user via all configured channels
 * (in-app, push, Telegram DM). Does NOT broadcast to supergroup/channel.
 */
export async function sendNotification({
  userId,
  type,
  title,
  content,
  entityType,
  entityId,
  actorUserId,
  pushPayload,
  url,
}: {
  userId: string;
  type: string;
  title: string;
  content: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  pushPayload?: { title: string; body: string; tag?: string };
  url?: string;
}) {
  if (!userId) return;

  // In-app notification (checks its own preferences internally)
  await sendInAppNotification({ userId, type, title, content, entityType, entityId, actorUserId, url });

  // Push notification
  if (pushPayload) {
    const enabled = await isPushEnabled(userId, type);
    if (enabled) {
      await sendPushNotification(userId, {
        title: pushPayload.title,
        body: pushPayload.body,
        url,
        tag: pushPayload.tag,
      });
    }
  }

  // Telegram DM notification (checks its own preferences internally)
  await sendTelegramNotification({ userId, eventType: type, title, content, url });
}

/**
 * Broadcast a generic event to supergroup/channel.
 * Use this for public/objective events that are NOT specific to one user.
 */
export async function broadcastEvent({
  type,
  title,
  content,
  url,
}: {
  type: string;
  title: string;
  content: string;
  url?: string;
}) {
  await broadcastToSupergroup(type, title + "\n\n" + content);
  await maybeBroadcastToChannel(type, title, content, url);
}
