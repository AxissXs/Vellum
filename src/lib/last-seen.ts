import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const THROTTLE_MS = 60_000;

const lastSeenTimestamps = new Map<string, number>();

export function shouldUpdateLastSeen(userId: string): boolean {
  const now = Date.now();
  const last = lastSeenTimestamps.get(userId);
  if (last && now - last < THROTTLE_MS) {
    return false;
  }
  lastSeenTimestamps.set(userId, now);
  return true;
}

export async function updateLastSeen(
  userId: string,
  ipAddress: string
): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        lastSeenAt: new Date(),
        lastSeenIp: ipAddress,
      })
      .where(eq(users.id, userId));
  } catch (_err) {
    console.warn("[last-seen] Failed to update lastSeen for user", userId);
  }
}
