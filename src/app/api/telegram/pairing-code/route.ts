import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { telegramPairingCodes } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Invalidate any existing unused codes for this user
  await db
    .update(telegramPairingCodes)
    .set({ used: true })
    .where(
      and(
        eq(telegramPairingCodes.userId, user.id),
        eq(telegramPairingCodes.used, false)
      )
    );

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(telegramPairingCodes).values({
    code,
    userId: user.id,
    used: false,
    expiresAt,
  });

  return NextResponse.json({ code });
}
