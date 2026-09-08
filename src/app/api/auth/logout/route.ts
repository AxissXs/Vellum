import { NextResponse } from "next/server";
import { SESSION_COOKIE, destroySession } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/hofs";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await destroySession(sessionId);
  }

  const res = clearSessionCookie(NextResponse.json({ success: true }));
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
