import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { setPlatformSetting } from "@/lib/platform-settings";
import { logActivity } from "@/lib/activity";
import { getAppTimezone } from "@/lib/timezone-server";
import {
  COMMON_TIMEZONES,
  DEFAULT_APP_TIMEZONE,
  TIMEZONE_SETTING_KEY,
  isValidIanaTimeZone,
} from "@/lib/timezone";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    requireRole(user, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const timezone = await getAppTimezone();
  return NextResponse.json({
    timezone,
    defaultTimezone: DEFAULT_APP_TIMEZONE,
    options: COMMON_TIMEZONES,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    requireRole(user, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";

  if (!timezone || !isValidIanaTimeZone(timezone)) {
    return NextResponse.json(
      { error: "Invalid IANA timezone" },
      { status: 400 }
    );
  }

  await setPlatformSetting(TIMEZONE_SETTING_KEY, timezone);

  logActivity({
    userId: user.id,
    action: "updated_timezone",
    entityType: "platform",
    entityId: TIMEZONE_SETTING_KEY,
    details: `Set app timezone to ${timezone}`,
  });

  return NextResponse.json({
    timezone,
    defaultTimezone: DEFAULT_APP_TIMEZONE,
    options: COMMON_TIMEZONES,
  });
}
