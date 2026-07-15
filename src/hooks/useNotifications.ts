"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getPusherClient } from "@/lib/pusher-client";

type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
};

export function getNotificationsQueryKey(): QueryKey {
  return ["notifications"];
}

export function getUnreadCountQueryKey(): QueryKey {
  return ["notifications", "unread-count"];
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<NotificationItem[]>({
    queryKey: getNotificationsQueryKey(),
    queryFn: async () => {
      const res = await api.get<{ notifications: NotificationItem[] }>(
        "/api/notifications"
      );
      return res.notifications;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Real-time badge update via Pusher
  useEffect(() => {
    if (typeof window === "undefined") return;

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const userId: string | null = data?.user?.id ?? null;
        if (!userId) return;

        const client = getPusherClient();
        const channelName = `user-${userId}`;
        const channel = client.subscribe(channelName);

        channel.bind("notification", (payload: { notification: NotificationItem }) => {
          queryClient.invalidateQueries({ queryKey: getNotificationsQueryKey() });
          // Optionally show a toast for new notifications
          if (payload.notification?.title) {
            toast.info(payload.notification.title, {
              description: payload.notification.content,
            });
          }
        });

        return () => {
          try {
            client.unsubscribe(channelName);
          } catch (_e) {
            // channel may not exist
          }
        };
      })
      .catch(() => {});
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/notifications/${id}`, {});
      return id;
    },
    onMutate: async (id) => {
      const queryKey = getNotificationsQueryKey();
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<NotificationItem[]>(queryKey);
      queryClient.setQueryData<NotificationItem[]>(queryKey, (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n)) || []
      );

      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getNotificationsQueryKey(), context.previous);
      }
      console.error("Failed to mark notification as read", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getNotificationsQueryKey() });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/notifications/mark-all-read", {});
    },
    onMutate: async () => {
      const queryKey = getNotificationsQueryKey();
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<NotificationItem[]>(queryKey);
      queryClient.setQueryData<NotificationItem[]>(queryKey, (old) =>
        old?.map((n) => ({ ...n, read: true })) || []
      );

      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getNotificationsQueryKey(), context.previous);
      }
      toast.error("Failed to mark all notifications as read");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getNotificationsQueryKey() });
    },
  });

  function markRead(id: string) {
    markReadMutation.mutate(id);
  }

  function markAllRead() {
    markAllReadMutation.mutate();
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
  };
}
