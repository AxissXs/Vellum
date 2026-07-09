import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";
import { ensureDemoData } from "@/db/bootstrap";

function isJsonRequest(req: NextRequest) {
  return req.headers.get("content-type")?.includes("application/json");
}

function setSessionCookie(res: NextResponse, sessionId: string) {
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    // Keep this false so auth works reliably in local/proxied preview
    // environments where TLS may be terminated before the Next.js server.
    secure: false,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

function relativeRedirect(location: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location },
  });
}

export async function POST(req: NextRequest) {
  const wantsJson = isJsonRequest(req);

  try {
    await ensureDemoData();

    let email = "";
    let password = "";

    if (wantsJson) {
      const body = await req.json();
      email = body.email || "";
      password = body.password || "";
    } else {
      const formData = await req.formData();
      email = String(formData.get("email") || "");
      password = String(formData.get("password") || "");
    }

    if (!email || !password) {
      if (wantsJson) {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }
      return relativeRedirect("/login?error=missing");
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      if (wantsJson) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
      return relativeRedirect("/login?error=invalid");
    }

    const sessionId = await createSession(user.id);

    if (wantsJson) {
      const res = NextResponse.json({ user });
      setSessionCookie(res, sessionId);
      return res;
    }

    const res = relativeRedirect("/dashboard");
    setSessionCookie(res, sessionId);
    return res;
  } catch (err) {
    console.error("Login error:", err);
    if (wantsJson) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    return relativeRedirect("/login?error=server");
  }
}
