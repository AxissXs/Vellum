import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;

export function getPusherClient(): Pusher {
  if (typeof window === "undefined") {
    throw new Error("Pusher client should only be used on the client side");
  }
  if (!pusherClient) {
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusherClient;
}

/**
 * Track active subscriptions per channel so we only unsubscribe
 * when the last component using that channel unmounts.
 */
const channelRefCounts = new Map<string, number>();

export function subscribeChannel(name: string): void {
  const count = channelRefCounts.get(name) || 0;
  channelRefCounts.set(name, count + 1);
  if (count === 0) {
    getPusherClient().subscribe(name);
  }
}

export function unsubscribeChannel(name: string): void {
  const count = (channelRefCounts.get(name) || 0) - 1;
  if (count <= 0) {
    channelRefCounts.delete(name);
    try {
      getPusherClient().unsubscribe(name);
    } catch (_e) {
      // channel may not exist
    }
  } else {
    channelRefCounts.set(name, count);
  }
}
