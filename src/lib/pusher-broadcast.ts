import { after } from "next/server";
import { pusher } from "@/lib/pusher";

/**
 * Broadcast a task event after the response is sent (non-blocking for the client).
 */
export function broadcastTaskEvent(
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
  after(async () => {
    try {
      await pusher.trigger(
        [`project-${projectId}`, "task-updates"],
        "task-event",
        payload
      );
    } catch (err) {
      console.error("Pusher broadcast failed:", err);
    }
  });
}

/**
 * Broadcast a comment event after the response is sent (non-blocking for the client).
 */
export function broadcastCommentEvent(
  taskId: string,
  payload: {
    type: "created" | "updated" | "deleted";
    comment?: Record<string, unknown>;
    commentId?: string;
    actorUserId: string;
    actorName: string;
  }
) {
  after(async () => {
    try {
      await pusher.trigger(`task-${taskId}`, "comment-event", payload);
    } catch (err) {
      console.error("Pusher broadcast failed:", err);
    }
  });
}
