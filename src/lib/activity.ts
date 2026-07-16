import { after } from "next/server";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";

export type ActivityLogInput = {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
};

/** Insert activity log after the response is sent (non-blocking for the client). */
export function logActivity(input: ActivityLogInput) {
  after(async () => {
    await db.insert(activityLogs).values({
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ?? null,
      ipAddress: input.ipAddress ?? null,
    });
  });
}
