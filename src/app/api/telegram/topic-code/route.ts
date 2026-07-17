import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { telegramTopicCodes } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { TELEGRAM_EVENT_TYPES } from "@/lib/telegram";

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

  const { eventType } = await req.json();
  if (!eventType || !TELEGRAM_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json(
      { error: `Invalid event type. Must be one of: ${TELEGRAM_EVENT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Invalidate previous unused codes for this event type
  await db
    .update(telegramTopicCodes)
    .set({ used: true })
    .where(
      and(
        eq(telegramTopicCodes.eventType, eventType),
        eq(telegramTopicCodes.used, false)
      )
    );

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(telegramTopicCodes).values({
    code,
    eventType,
    used: false,
    expiresAt,
  });

  return NextResponse.json({ code, eventType });
}
