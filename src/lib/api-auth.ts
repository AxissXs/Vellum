import { NextRequest } from "next/server";
import { db } from "@/db";
import { apiTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import type { AuthUser } from "./auth";

export type AuthResult = {
  user: AuthUser;
  authMethod: "cookie" | "token";
  tokenId?: string;
};

export async function getTokenUser(req: NextRequest): Promise<{ user: AuthUser; tokenId: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer vellum_")) return null;

  const token = authHeader.slice(7); // "vellum_..."
  if (token.length < 16) return null;

  const prefix = token.slice(8, 16); // first 8 hex chars after "vellum_"

  const [tokenRow] = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.prefix, prefix))
    .limit(1);

  if (!tokenRow) return null;

  const valid = compareSync(token, tokenRow.tokenHash);
  if (!valid) return null;

  if (tokenRow.expiresAt && tokenRow.expiresAt < new Date()) return null;

  if (!tokenRow.lastUsedAt || Date.now() - tokenRow.lastUsedAt.getTime() > 300_000) {
    await db
      .update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, tokenRow.id));
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, tokenRow.userId))
    .limit(1);

  if (!user || user.status === "banned") return null;

  return { user: user as AuthUser, tokenId: tokenRow.id };
}
