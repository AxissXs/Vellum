"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPusherClientAsync,
  subscribeChannel,
  unsubscribeChannel,
} from "@/lib/pusher-client";
import {
  getNotificationsQueryKey,
} from "@/hooks/useNotifications";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";

type NotificationItem = {
  id: string;
  title: string;
  content: string;
};

/**
 * Single Pusher subscription for in-app notifications.
 * Mount once (ClientLayout) — NotificationBell is rendered twice (mobile + desktop).
 */
export default function NotificationRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let channelName: string | null = null;
    let channel: Channel | null = null;
    let client: Pusher | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const me = await fetch("/api/auth/me").then((res) => res.json());
        if (cancelled) return;
        const userId: string | null = me?.user?.id ?? null;
        if (!userId) return;

        client = await getPusherClientAsync();
        if (!client || cancelled) return;

        channelName = `user-${userId}`;
        subscribeChannel(channelName, client);
        channel = client.subscribe(channelName);
        channel.bind(
          "notification",
          (payload: { notification: NotificationItem }) => {
            queryClient.invalidateQueries({
              queryKey: getNotificationsQueryKey(),
            });
            if (payload.notification?.title) {
              toast.info(payload.notification.title, {
                id: `notif-${payload.notification.id}`,
                description: payload.notification.content,
              });
            }
          }
        );
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
      if (channelName && client) {
        channel?.unbind("notification");
        unsubscribeChannel(channelName, client);
      }
    };
  }, [queryClient]);

  return null;
}
