import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;
let warnedMissingKey = false;

/**
 * Returns a Pusher client, or null when public keys are not configured.
 * Call sites must no-op on null so missing env never crashes the app shell.
 */
export function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") {
    throw new Error("Pusher client should only be used on the client side");
  }

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "Pusher realtime disabled: NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER not set",
      );
    }
    return null;
  }

  if (!pusherClient) {
    pusherClient = new Pusher(key, { cluster });
  }
  return pusherClient;
}

/**
 * Track active subscriptions per channel so we only unsubscribe
 * when the last component using that channel unmounts.
 */
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
