import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { getPlatformSetting, setPlatformSetting } from "@/lib/telegram";

const SETTINGS_KEYS = [
  "telegram_bot_token",
  "telegram_supergroup_id",
  "telegram_channel_id",
];

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  requireRole(user, ["superadmin"]);

  const settings: Record<string, string | null> = {};
  for (const key of SETTINGS_KEYS) {
    settings[key] = await getPlatformSetting(key);
  }

  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  requireRole(user, ["superadmin"]);

  const body = await req.json();

  for (const key of SETTINGS_KEYS) {
    if (body[key] !== undefined) {
      await setPlatformSetting(key, body[key] || null);
    }
  }

  const settings: Record<string, string | null> = {};
  for (const key of SETTINGS_KEYS) {
    settings[key] = await getPlatformSetting(key);
  }

  return NextResponse.json({ settings });
}
