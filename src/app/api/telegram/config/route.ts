import { NextResponse } from "next/server";
import { isTelegramConfigured, getTelegramBotInfo } from "@/lib/telegram";

export async function GET() {
  const configured = await isTelegramConfigured();

  let username: string | null = null;
  if (configured) {
    const info = await getTelegramBotInfo();
    if (info.ok) username = info.username ?? null;
  }

  return NextResponse.json({ configured, username });
}
