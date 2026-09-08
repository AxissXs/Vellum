import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { apiTokens } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { writeActivityLog, getClientIP } from "@/lib/audit";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      lastUsedAt: apiTokens.lastUsedAt,
      expiresAt: apiTokens.expiresAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, user.id))
    .orderBy(desc(apiTokens.createdAt));

  return NextResponse.json({ tokens });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, expiresInDays } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const randomBytes = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const fullToken = `vellum_${randomBytes}`;
  const prefix = randomBytes.slice(0, 8);
  const tokenHash = hashSync(fullToken, 10);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const [token] = await db
    .insert(apiTokens)
    .values({
      userId: user.id,
      name: name.trim(),
      tokenHash,
      prefix,
      expiresAt,
    })
    .returning();

  await writeActivityLog({
    userId: user.id,
    action: "created_api_token",
    entityType: "api_token",
    entityId: token.id,
    details: `Created API token: ${name.trim()}`,
    ipAddress: getClientIP(req),
  });

  return NextResponse.json({
    token: fullToken,
    tokenInfo: {
      id: token.id,
      name: token.name,
      prefix: token.prefix,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
    },
  }, { status: 201 });
}
