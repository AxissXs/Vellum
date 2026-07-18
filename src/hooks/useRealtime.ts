"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPusherClient } from "@/lib/pusher-client";
import { getTaskQueryKey } from "@/hooks/useTasks";
import { getCommentQueryKey } from "@/hooks/useComments";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  position: string;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  projectName?: string | null;
  projectColor?: string | null;
};

type Comment = {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  authorAvatar: string | null;
};

export type TaskUpdatePayload = {
  type: "created" | "updated" | "deleted" | "reordered";
  task?: Task;
  taskId?: string;
  updates?: { id: string; position: string; status: string }[];
  projectId?: string;
  actorUserId: string;
  actorName: string;
};

export type CommentUpdatePayload = {
  type: "created" | "updated" | "deleted";
  comment?: Comment;
  commentId?: string;
  taskId: string;
  actorUserId: string;
  actorName: string;
};

/**
 * Subscribe to real-time task and comment updates via Pusher.
 *
 * @param projectId - Optional project ID to scope task events. If omitted, listens globally.
 * @param taskId - Optional task ID to scope comment events. If omitted, no comment channel is subscribed.
 */
export function useRealtime(projectId?: string, taskId?: string) {
  const queryClient = useQueryClient();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Get current user ID to avoid self-notifications
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) userIdRef.current = data.user.id;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const client = getPusherClient();
    const channels: string[] = [];

    const isSelf = (actorUserId: string) => actorUserId === userIdRef.current;

    // ── Task updates ──
    const projectChannel = projectId ? `project-${projectId}` : null;
    const globalChannel = "task-updates";

    // Subscribe to project-specific channel if provided
    if (projectChannel) {
      const taskChannel = client.subscribe(projectChannel);
      channels.push(projectChannel);

      taskChannel.bind("task-event", (payload: TaskUpdatePayload) => {
        const projectIdFromPayload = payload.projectId || payload.task?.projectId;
        if (projectIdFromPayload) {
          queryClient.invalidateQueries({ queryKey: getTaskQueryKey(projectIdFromPayload) });
        }
        queryClient.invalidateQueries({ queryKey: getTaskQueryKey(undefined) });

        if (!isSelf(payload.actorUserId)) {
          switch (payload.type) {
            case "created":
              if (payload.task) toast.info(`${payload.actorName} created task: ${payload.task.title}`);
              break;
            case "updated":
              if (payload.task) toast.info(`${payload.actorName} updated task: ${payload.task.title}`);
              break;
            case "deleted":
              if (payload.taskId) toast.info(`${payload.actorName} deleted a task`);
              break;
            case "reordered":
              toast.info(`${payload.actorName} reordered tasks`);
              break;
          }
        }
      });
    }

    // Always also subscribe to global task-updates for non-project-scoped contexts
    if (!projectChannel) {
      const globalTaskChannel = client.subscribe(globalChannel);
      channels.push(globalChannel);

      globalTaskChannel.bind("task-event", (payload: TaskUpdatePayload) => {
        const projectIdFromPayload = payload.projectId || payload.task?.projectId;
        if (projectIdFromPayload) {
          queryClient.invalidateQueries({ queryKey: getTaskQueryKey(projectIdFromPayload) });
        }
        queryClient.invalidateQueries({ queryKey: getTaskQueryKey(undefined) });

        if (!isSelf(payload.actorUserId)) {
          switch (payload.type) {
            case "created":
              if (payload.task) toast.info(`${payload.actorName} created task: ${payload.task.title}`);
              break;
            case "updated":
              if (payload.task) toast.info(`${payload.actorName} updated task: ${payload.task.title}`);
              break;
            case "deleted":
              if (payload.taskId) toast.info(`${payload.actorName} deleted a task`);
              break;
            case "reordered":
              toast.info(`${payload.actorName} reordered tasks`);
              break;
          }
        }
      });
    }

    // ── Comment updates ──
    if (taskId) {
      const commentChannelName = `task-${taskId}`;
      const commentChannel = client.subscribe(commentChannelName);
      channels.push(commentChannelName);

      commentChannel.bind("comment-event", (payload: CommentUpdatePayload) => {
        queryClient.invalidateQueries({ queryKey: getCommentQueryKey(payload.taskId) });

        if (!isSelf(payload.actorUserId)) {
          switch (payload.type) {
            case "created":
              toast.info(`${payload.actorName} added a comment`);
              break;
            case "updated":
              toast.info(`${payload.actorName} updated a comment`);
              break;
            case "deleted":
              toast.info(`${payload.actorName} deleted a comment`);
              break;
          }
        }
      });
    }

    return () => {
      channels.forEach((name) => {
        try {
          client.unsubscribe(name);
        } catch (_e) {
          // channel may not exist
        }
      });
    };
  }, [projectId, taskId, queryClient]);
}
