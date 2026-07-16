import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { getTelegramBotInfo } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  requireRole(user, ["superadmin"]);

  const { token } = await req.json();

  let info;
  if (token) {
    // Test the provided token directly without saving
    const fetchUrl = `https://api.telegram.org/bot${token}/getMe`;
    const res = await fetch(fetchUrl).catch(() => null);
    if (!res) {
      return NextResponse.json({ ok: false, error: "Failed to reach Telegram API" }, { status: 400 });
    }
    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json(
        { ok: false, error: data.description || "Invalid bot token" },
        { status: 400 }
      );
    }
    info = data.result;
  } else {
    const result = await getTelegramBotInfo();
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.description || "Failed to connect to Telegram" },
        { status: 400 }
      );
    }
    info = { username: result.username, first_name: result.firstName };
  }

  return NextResponse.json({ ok: true, username: info.username, firstName: info.first_name });
}
