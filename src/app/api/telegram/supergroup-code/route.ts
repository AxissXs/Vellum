import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { getPlatformSetting, setPlatformSetting } from "@/lib/telegram";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  requireRole(user, ["superadmin"]);

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  await setPlatformSetting("telegram_supergroup_pairing_code", code);
  await setPlatformSetting("telegram_supergroup_pairing_expires", String(expiresAt));

  return NextResponse.json({ code });
}
