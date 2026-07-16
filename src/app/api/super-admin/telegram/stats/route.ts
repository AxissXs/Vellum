import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isNotNull, count } from "drizzle-orm";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  requireRole(user, ["superadmin"]);

  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(isNotNull(users.telegramChatId));

  return NextResponse.json({ pairedUsers: result?.count ?? 0 });
}
