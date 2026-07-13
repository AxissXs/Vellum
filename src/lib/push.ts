import webPush from "web-push";
import { db } from "@/db";
import { pushSubscriptions, notificationPreferences } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (typeof window === "undefined" && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export { webPush, vapidPublicKey };

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  if (typeof window !== "undefined") return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
}

export async function getNotificationPreferences(userId: string) {
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  return prefs;
}

export async function getDefaultNotificationPreferences() {
  return [
    { eventType: "task_assigned", pushEnabled: true, inAppEnabled: true, emailEnabled: false },
    { eventType: "task_mentioned", pushEnabled: true, inAppEnabled: true, emailEnabled: false },
    { eventType: "due_date_approaching", pushEnabled: true, inAppEnabled: true, emailEnabled: false },
    { eventType: "status_changed", pushEnabled: true, inAppEnabled: true, emailEnabled: false },
    { eventType: "new_comment", pushEnabled: true, inAppEnabled: true, emailEnabled: false },
    { eventType: "comment_mention", pushEnabled: true, inAppEnabled: true, emailEnabled: false },
  ] as const;
}

export async function ensureNotificationPreferences(userId: string) {
  const existing = await getNotificationPreferences(userId);

  if (existing.length === 0) {
    const defaults = await getDefaultNotificationPreferences();
    for (const pref of defaults) {
      await db.insert(notificationPreferences).values({
        userId,
        eventType: pref.eventType,
        pushEnabled: pref.pushEnabled,
        inAppEnabled: pref.inAppEnabled,
        emailEnabled: pref.emailEnabled,
      });
    }
  }

  return getNotificationPreferences(userId);
}

export async function updateNotificationPreference(
  userId: string,
  eventType: string,
  channels: { pushEnabled?: boolean; inAppEnabled?: boolean; emailEnabled?: boolean }
) {
  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.eventType, eventType as any)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(notificationPreferences)
      .set({
        ...channels,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.id, existing[0].id));
  } else {
    await db.insert(notificationPreferences).values({
      userId,
      eventType: eventType as any,
      pushEnabled: channels.pushEnabled ?? true,
      inAppEnabled: channels.inAppEnabled ?? true,
      emailEnabled: channels.emailEnabled ?? false,
    });
  }
}

export async function isPushEnabled(userId: string, eventType: string) {
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
  return prefs[0].pushEnabled;
}
