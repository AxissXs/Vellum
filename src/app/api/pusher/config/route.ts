import { NextResponse } from "next/server";

/**
 * Public Pusher Channels config for the browser.
 * Prefer runtime `PUSHER_KEY` / `PUSHER_CLUSTER` so Deno Deploy Production env
 * works even when Build-context `NEXT_PUBLIC_*` was missing at `next build`.
 */
export async function GET() {
  const key =
    process.env.PUSHER_KEY?.trim() ||
    process.env.NEXT_PUBLIC_PUSHER_KEY?.trim() ||
    "";
  const cluster =
    process.env.PUSHER_CLUSTER?.trim() ||
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim() ||
    "";

  if (!key || !cluster) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({ configured: true, key, cluster });
}
