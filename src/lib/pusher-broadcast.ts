import { getPusherServer } from "@/lib/pusher";

/**
 * Broadcast a task event before the response finishes.
 * Must be awaited — Deno Deploy drops next/server `after()` work when the isolate ends.
 */
export async function broadcastTaskEvent(
  projectId: string,
  payload: {
    type: "created" | "updated" | "deleted" | "reordered";
    task?: Record<string, unknown>;
    taskId?: string;
    updates?: { id: string; position: string; status: string }[];
    actorUserId: string;
    actorName: string;
  }
) {
  try {
    const client = getPusherServer();
    if (!client) return;
    await client.trigger(
      [`project-${projectId}`, "task-updates"],
      "task-event",
      { ...payload, projectId }
    );
  } catch (err) {
    console.error("Pusher broadcast failed:", err);
  }
}

/**
 * Broadcast a comment event. Must be awaited (same Deno Deploy constraint as tasks).
 */
export async function broadcastCommentEvent(
  taskId: string,
  payload: {
    type: "created" | "updated" | "deleted";
    comment?: Record<string, unknown>;
    commentId?: string;
    actorUserId: string;
    actorName: string;
  }
) {
  try {
    const client = getPusherServer();
    if (!client) return;
    await client.trigger(`task-${taskId}`, "comment-event", {
      ...payload,
      taskId,
    });
  } catch (err) {
    console.error("Pusher broadcast failed:", err);
  }
}

/**
 * Broadcast a schedule event for live calendar refresh. Must be awaited.
 */
export async function broadcastScheduleEvent(payload: {
  type: "created" | "updated" | "deleted";
  scheduleId?: string;
  schedule?: Record<string, unknown>;
  userId?: string;
  actorUserId: string;
  actorName: string;
}) {
  try {
    const client = getPusherServer();
    if (!client) return;
    await client.trigger("calendar-updates", "schedule-event", payload);
  } catch (err) {
    console.error("Pusher broadcast failed:", err);
  }
}
