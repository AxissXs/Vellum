import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { apiTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [token] = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, user.id)))
    .limit(1);

  if (!token) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  await db.delete(apiTokens).where(eq(apiTokens.id, id));

  await writeActivityLog({
    userId: user.id,
    action: "deleted_api_token",
    entityType: "api_token",
    entityId: id,
    details: `Revoked API token: ${token.name}`,
    ipAddress: getClientIP(req),
  });

  return NextResponse.json({ success: true });
}
