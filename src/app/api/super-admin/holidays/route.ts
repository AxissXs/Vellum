import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { setPlatformSetting } from "@/lib/platform-settings";
import { logActivity } from "@/lib/activity";
import { getHolidayCountry } from "@/lib/holidays-server";
import {
  DEFAULT_HOLIDAY_COUNTRY,
  HOLIDAY_COUNTRIES,
  HOLIDAY_COUNTRY_SETTING_KEY,
  isValidHolidayCountry,
} from "@/lib/holidays";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    requireRole(user, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const country = await getHolidayCountry();
  return NextResponse.json({
    country,
    defaultCountry: DEFAULT_HOLIDAY_COUNTRY,
    options: HOLIDAY_COUNTRIES,
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
  const country = typeof body.country === "string" ? body.country.trim() : "";

  if (!country || !isValidHolidayCountry(country)) {
    return NextResponse.json(
      { error: "Invalid holiday country" },
      { status: 400 }
    );
  }

  await setPlatformSetting(HOLIDAY_COUNTRY_SETTING_KEY, country);

  logActivity({
    userId: user.id,
    action: "updated_holiday_country",
    entityType: "platform",
    entityId: HOLIDAY_COUNTRY_SETTING_KEY,
    details: `Set holiday country to ${country}`,
  });

  return NextResponse.json({
    country,
    defaultCountry: DEFAULT_HOLIDAY_COUNTRY,
    options: HOLIDAY_COUNTRIES,
  });
}
