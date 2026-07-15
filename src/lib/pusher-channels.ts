// This module is loaded for side effects so Next.js bundler does not tree shake it.
// It keeps per-channel reference counts for shared Pusher subscriptions.
import { getPusherClient } from "./pusher-client";

const channelRefCounts = new Map<string, number>();

export function subscribeChannel(name: string): void {
  const client = getPusherClient();
  if (!client) return;

  const count = channelRefCounts.get(name) || 0;
  channelRefCounts.set(name, count + 1);
  if (count === 0) {
    client.subscribe(name);
  }
}

export function unsubscribeChannel(name: string): void {
  const count = (channelRefCounts.get(name) || 0) - 1;
  if (count <= 0) {
    channelRefCounts.delete(name);
    try {
      getPusherClient()?.unsubscribe(name);
    } catch (_e) {
      // channel may not exist
    }
  } else {
    channelRefCounts.set(name, count);
  }
}
