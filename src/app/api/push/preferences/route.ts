import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getNotificationPreferences,
  ensureNotificationPreferences,
  updateNotificationPreference,
} from "@/lib/push";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await ensureNotificationPreferences(user.id);
  return NextResponse.json({ preferences: prefs });
}

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventType, pushEnabled, inAppEnabled, emailEnabled } = await req.json();

  if (!eventType) {
    return NextResponse.json({ error: "eventType is required" }, { status: 400 });
  }

  await updateNotificationPreference(user.id, eventType, {
    pushEnabled,
    inAppEnabled,
    emailEnabled,
  });

  const prefs = await getNotificationPreferences(user.id);
  return NextResponse.json({ preferences: prefs });
}
