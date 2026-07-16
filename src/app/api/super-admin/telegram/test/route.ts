import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { getTelegramBotInfo, sendTelegramMessage } from "@/lib/telegram";

export async function POST() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  requireRole(user, ["superadmin"]);

  const info = await getTelegramBotInfo();
  if (!info.ok) {
    return NextResponse.json(
      { ok: false, error: info.description || "Failed to connect to Telegram" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, username: info.username, firstName: info.firstName });
}
