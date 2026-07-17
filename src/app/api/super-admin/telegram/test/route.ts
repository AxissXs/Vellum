import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { getTelegramBotInfo } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    requireRole(user, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let token: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.token === "string" && body.token.trim()) {
      token = body.token.trim();
    }
  } catch {
    // empty body OK — test stored token
  }

  const info = await getTelegramBotInfo(token);
  if (!info.ok) {
    return NextResponse.json(
      { ok: false, error: info.description || "Failed to connect to Telegram" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    username: info.username,
    firstName: info.firstName,
  });
}
