import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

/** Lazy server Pusher client — skip init when credentials missing (build / local). */
export function getPusherServer(): Pusher | null {
  if (typeof window !== "undefined") return null;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) return null;

  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }
  return pusherInstance;
}

/** @deprecated Prefer getPusherServer() — kept for call-site compatibility. */
export const pusher = {
  trigger: async (
    channels: string | string[],
    event: string,
    data: unknown
  ) => {
    const client = getPusherServer();
    if (!client) return;
    return client.trigger(channels, event, data);
  },
};
