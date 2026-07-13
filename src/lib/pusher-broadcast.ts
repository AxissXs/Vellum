import { pusher } from "@/lib/pusher";

/**
 * Broadcast a task event to all clients viewing the relevant project
 * and the global task-updates channel.
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
    await pusher.trigger(
      [`project-${projectId}`, "task-updates"],
      "task-event",
      payload
    );
  } catch (err) {
    // Swallow Pusher errors so they don't break the request
    console.error("Pusher broadcast failed:", err);
  }
}

/**
 * Broadcast a comment event to all clients viewing the task.
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
    await pusher.trigger(`task-${taskId}`, "comment-event", payload);
  } catch (err) {
    console.error("Pusher broadcast failed:", err);
  }
}
