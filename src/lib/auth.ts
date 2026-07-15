import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";

const SESSION_COOKIE = "tf_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "member";
  status: "active" | "inactive" | "banned";
  avatarUrl: string | null;
};

export const getSession = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .leftJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row) return null;

  if (row.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  if (!row.id) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return {
    id: row.id,
    name: row.name!,
    email: row.email!,
    role: row.role!,
    status: row.status!,
    avatarUrl: row.avatarUrl,
  };
});

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

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) return null;
  if (!(await compare(password, user.passwordHash))) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
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

export { SESSION_COOKIE, SESSION_MAX_AGE };
