"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type Pusher from "pusher-js";
import {
  getPusherClientAsync,
  subscribeChannel,
  unsubscribeChannel,
} from "@/lib/pusher-client";
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
 * @param onTaskEvent - Optional handler for local UI (e.g. Kanban columns). Remote actors only.
 */
export function useRealtime(
  projectId?: string,
  taskId?: string,
  onTaskEvent?: (payload: TaskUpdatePayload) => void
) {
  const queryClient = useQueryClient();
  const userIdRef = useRef<string | null>(null);
  const onTaskEventRef = useRef(onTaskEvent);
  onTaskEventRef.current = onTaskEvent;

  useEffect(() => {
    if (typeof window === "undefined") return;

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) userIdRef.current = data.user.id;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const state: { client: Pusher | null; channels: string[] } = {
      client: null,
      channels: [],
    };

    const isSelf = (actorUserId: string) => actorUserId === userIdRef.current;

    const handleTaskEvent = (payload: TaskUpdatePayload) => {
      const projectIdFromPayload = payload.projectId || payload.task?.projectId;
      if (projectIdFromPayload) {
        queryClient.invalidateQueries({
          queryKey: getTaskQueryKey(projectIdFromPayload),
        });
      }
      queryClient.invalidateQueries({ queryKey: getTaskQueryKey(undefined) });

      if (!isSelf(payload.actorUserId)) {
        onTaskEventRef.current?.(payload);

        // Skip toast for "updated" — status moves already fire an in-app
        // notification toast for the assignee/creator (duplicate otherwise).
        // Board columns still patch via onTaskEvent.
        switch (payload.type) {
          case "created":
            if (payload.task) {
              toast.info(
                `${payload.actorName} created task: ${payload.task.title}`
              );
            }
            break;
          case "deleted":
            if (payload.taskId) {
              toast.info(`${payload.actorName} deleted a task`);
            }
            break;
          case "reordered":
            toast.info(`${payload.actorName} reordered tasks`);
            break;
        }
      }
    };

    const handleCommentEvent = (payload: CommentUpdatePayload) => {
      queryClient.invalidateQueries({
        queryKey: getCommentQueryKey(payload.taskId),
      });

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
    };

    void (async () => {
      const client = await getPusherClientAsync();
      if (!client || cancelled) return;
      state.client = client;

      const bindTaskChannel = (name: string) => {
        subscribeChannel(name, client);
        state.channels.push(name);
        client.subscribe(name).bind("task-event", handleTaskEvent);
      };

      if (projectId) {
        bindTaskChannel(`project-${projectId}`);
      } else if (!taskId) {
        // Global board only — task-detail (taskId alone) must not join
        // task-updates or the same move toasts twice (project + global).
        bindTaskChannel("task-updates");
      }

      if (taskId) {
        const commentChannelName = `task-${taskId}`;
        subscribeChannel(commentChannelName, client);
        state.channels.push(commentChannelName);
        client
          .subscribe(commentChannelName)
          .bind("comment-event", handleCommentEvent);
      }

      if (cancelled) {
        // Effect cleaned up while we were subscribing
        for (const name of state.channels) {
          const ch = client.channel(name);
          ch?.unbind("task-event", handleTaskEvent);
          ch?.unbind("comment-event", handleCommentEvent);
          unsubscribeChannel(name, client);
        }
        state.channels = [];
      }
    })();

    return () => {
      cancelled = true;
      const { client, channels } = state;
      if (!client) return;
      for (const name of channels) {
        const ch = client.channel(name);
        ch?.unbind("task-event", handleTaskEvent);
        ch?.unbind("comment-event", handleCommentEvent);
        unsubscribeChannel(name, client);
      }
    };
  }, [projectId, taskId, queryClient]);
}
