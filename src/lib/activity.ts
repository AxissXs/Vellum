import { after } from "next/server";
import { db } from "@/db";
import { activityLogs, activityLogSnapshots } from "@/db/schema";
import { classifyTag, classifySeverity, type Snapshot } from "@/lib/audit";

export type ActivityLogInput = {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  tag?: string | null;
  severity?: string | null;
  snapshots?: Snapshot[];
};

/** Insert activity log after the response is sent (non-blocking for the client). */
export function logActivity(input: ActivityLogInput) {
  after(async () => {
    const tag = input.tag ?? classifyTag(input.action);
    const severity = input.severity ?? classifySeverity(input.action);

    const [log] = await db
      .insert(activityLogs)
      .values({
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        details: input.details ?? null,
        ipAddress: input.ipAddress ?? null,
        tag,
        severity,
      })
      .returning({ id: activityLogs.id });

    if (input.snapshots && input.snapshots.length > 0 && log) {
      await db.insert(activityLogSnapshots).values(
        input.snapshots.map((s) => ({
          logId: log.id,
          tableName: s.tableName,
          recordId: s.recordId,
          snapshot: JSON.stringify(s.snapshot),
          snapshotType: s.snapshotType,
        }))
      );
    }
  });
}
