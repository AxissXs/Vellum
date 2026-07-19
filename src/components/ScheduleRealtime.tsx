"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getPusherClientAsync,
  subscribeChannel,
  unsubscribeChannel,
} from "@/lib/pusher-client";
import type Pusher from "pusher-js";

export type ScheduleUpdatePayload = {
  type: "created" | "updated" | "deleted";
  scheduleId?: string;
  actorUserId: string;
  actorName: string;
  userId?: string;
};

const CHANNEL = "calendar-updates";
const EVENT = "schedule-event";

/**
 * Invalidate calendar queries when schedules change (other users / other tabs).
 * Mount once in the dashboard shell — no toast (assignee gets in-app notification).
 */
export function useScheduleRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const state: { client: Pusher | null; subscribed: boolean } = {
      client: null,
      subscribed: false,
    };

    const handler = (_payload: ScheduleUpdatePayload) => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    };

    void (async () => {
      const client = await getPusherClientAsync();
      if (!client || cancelled) return;
      state.client = client;
      subscribeChannel(CHANNEL, client);
      client.subscribe(CHANNEL).bind(EVENT, handler);
      state.subscribed = true;

      if (cancelled) {
        client.channel(CHANNEL)?.unbind(EVENT, handler);
        unsubscribeChannel(CHANNEL, client);
        state.subscribed = false;
      }
    })();

    return () => {
      cancelled = true;
      if (state.client && state.subscribed) {
        state.client.channel(CHANNEL)?.unbind(EVENT, handler);
        unsubscribeChannel(CHANNEL, state.client);
      }
    };
  }, [queryClient]);
}

/** Mount-once helper for ClientLayout. */
export default function ScheduleRealtime() {
  useScheduleRealtime();
  return null;
}
