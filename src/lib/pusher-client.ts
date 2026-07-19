"use client";

import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;
let initPromise: Promise<Pusher | null> | null = null;
let warnedMissingKey = false;

async function resolvePublicConfig(): Promise<{
  key: string;
  cluster: string;
} | null> {
  const buildKey = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
  const buildCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();
  if (buildKey && buildCluster) {
    return { key: buildKey, cluster: buildCluster };
  }

  try {
    const res = await fetch("/api/pusher/config");
    if (!res.ok) return null;
    const data = (await res.json()) as {
      configured?: boolean;
      key?: string;
      cluster?: string;
    };
    if (!data.configured || !data.key || !data.cluster) return null;
    return { key: data.key, cluster: data.cluster };
  } catch {
    return null;
  }
}

/**
 * Shared Pusher client, or null when not configured.
 * Resolves build-time NEXT_PUBLIC_* first, then runtime `/api/pusher/config`.
 */
export function getPusherClientAsync(): Promise<Pusher | null> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Pusher client should only be used on the client side")
    );
  }

  if (pusherClient) return Promise.resolve(pusherClient);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const config = await resolvePublicConfig();
    if (!config) {
      if (!warnedMissingKey) {
        warnedMissingKey = true;
        console.warn(
          "Pusher realtime disabled: no key/cluster (build env or /api/pusher/config)"
        );
      }
      return null;
    }
    pusherClient = new Pusher(config.key, { cluster: config.cluster });
    return pusherClient;
  })();

  return initPromise;
}

/** @deprecated Prefer getPusherClientAsync — sync path only works when NEXT_PUBLIC_* inlined. */
export function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") {
    throw new Error("Pusher client should only be used on the client side");
  }
  return pusherClient;
}

/**
 * Track active subscriptions per channel so we only unsubscribe
 * when the last component using that channel unmounts.
 */
const channelRefCounts = new Map<string, number>();

export function subscribeChannel(name: string, client: Pusher): void {
  const count = channelRefCounts.get(name) || 0;
  channelRefCounts.set(name, count + 1);
  if (count === 0) {
    client.subscribe(name);
  }
}

export function unsubscribeChannel(name: string, client: Pusher): void {
  const count = (channelRefCounts.get(name) || 0) - 1;
  if (count <= 0) {
    channelRefCounts.delete(name);
    try {
      client.unsubscribe(name);
    } catch (_e) {
      // channel may not exist
    }
  } else {
    channelRefCounts.set(name, count);
  }
}
