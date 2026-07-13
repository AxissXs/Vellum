import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";
import { ensureDemoData } from "@/db/bootstrap";
import { db } from "@/db";
import { users, userSessions } from "@/db/schema";

function isJsonRequest(req: NextRequest) {
  return req.headers.get("content-type")?.includes("application/json");
}

function setSessionCookie(res: NextResponse, sessionId: string) {
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
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

async function isInitialized() {
  const existingUsers = await db.select({ count: users.id }).from(users).limit(1);
  return existingUsers.length > 0;
}

export async function POST(req: NextRequest) {
  const wantsJson = isJsonRequest(req);

  // Capture request metadata for login auditing
  const ipAddress =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    if (process.env.NODE_ENV === "development") {
      await ensureDemoData();
    } else {
      const initialized = await isInitialized();
      if (!initialized) {
        if (wantsJson) {
          return NextResponse.json(
            { error: "Workspace not initialized", redirect: "/setup" },
            { status: 400 }
          );
        }
        return relativeRedirect("/setup");
      }
    }

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
      // Track failed login — missing credentials
      try {
        await db.insert(userSessions).values({
          userId: null,
          ipAddress,
          userAgent,
          success: false,
          failedReason: "missing_credentials",
        });
      } catch (e) {
        console.error("Failed to log session:", e);
      }

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
      // Track failed login — invalid credentials
      try {
        await db.insert(userSessions).values({
          userId: null,
          ipAddress,
          userAgent,
          success: false,
          failedReason: "invalid_credentials",
        });
      } catch (e) {
        console.error("Failed to log session:", e);
      }

      if (wantsJson) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
      return relativeRedirect("/login?error=invalid");
    }

    // Track successful login
    try {
      await db.insert(userSessions).values({
        userId: user.id,
        ipAddress,
        userAgent,
        success: true,
      });
    } catch (e) {
      console.error("Failed to log session:", e);
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
