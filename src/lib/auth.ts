import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, gt } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { shouldUpdateLastSeen, updateLastSeen } from "./last-seen";
import { getClientIPFromHeaders } from "./audit";
import { getTokenUser } from "./api-auth";

const SESSION_COOKIE = "tf_session";
const IMPERSONATOR_SESSION_COOKIE = "tf_impersonator";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "member";
  status: "active" | "inactive" | "banned";
  avatarUrl: string | null;
};

export type SessionAuthResult = {
  user: AuthUser;
  authMethod: "cookie" | "token";
  tokenId?: string;
};

export async function getSession(req?: NextRequest): Promise<AuthUser | null> {
  const result = await getSessionWithAuthMethod(req);
  return result?.user ?? null;
}

export async function getSessionWithAuthMethod(req?: NextRequest): Promise<SessionAuthResult | null> {
  // 1. Try cookie auth
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    const cookieUser = await getCookieUser(sessionId);
    if (cookieUser) {
      return { user: cookieUser, authMethod: "cookie" };
    }
  }

  // 2. Try token auth
  if (req) {
    const tokenResult = await getTokenUser(req);
    if (tokenResult) {
      return { user: tokenResult.user, authMethod: "token", tokenId: tokenResult.tokenId };
    }
  }

  return null;
}

async function getCookieUser(sessionId: string): Promise<AuthUser | null> {
  const [session] = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    }
    return null;
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
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  if (user.status === "banned") {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  const hdrs = await headers();
  const hasImpersonatorCookie = hdrs.get("cookie")?.includes(`${IMPERSONATOR_SESSION_COOKIE}=`) ?? false;
  if (!hasImpersonatorCookie && shouldUpdateLastSeen(user.id)) {
    const ip = getClientIPFromHeaders(hdrs);
    updateLastSeen(user.id, ip).catch(() => {});
  }

  return user as AuthUser;
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  return sessionId;
}

export async function destroySession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "invalid_credentials" | "inactive" | "banned" };

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user || !compareSync(password, user.passwordHash)) {
    return { ok: false, reason: "invalid_credentials" };
  }

  if (user.status === "inactive") {
    return { ok: false, reason: "inactive" };
  }

  if (user.status === "banned") {
    return { ok: false, reason: "banned" };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
    },
  };
}

export function requireAuth(user: AuthUser | null): asserts user is AuthUser {
  if (!user) {
    throw new Error("Unauthorized");
  }
}

export function requireRole(
  user: AuthUser | null,
  roles: Array<"superadmin" | "admin" | "member">
): asserts user is AuthUser {
  requireAuth(user);
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
}

export { SESSION_COOKIE, IMPERSONATOR_SESSION_COOKIE, SESSION_MAX_AGE };
