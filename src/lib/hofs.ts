import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole, type AuthUser } from "./auth";

/**
 * Helpers shared by withAuth / withRole.
 */
export function unauthorizedResponse(): NextResponse {
  const response = NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
  // Blow away stale cookies so the client can't send them again.
  response.cookies.delete("tf_session");
  response.cookies.delete("tf_impersonator");
  return response;
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete("tf_session");
  response.cookies.delete("tf_impersonator");
  return response;
}

/* ------------------------------------------------------------------ */
/*  Type-level glue — preserves whatever extra params Next.js passes   */
/* ------------------------------------------------------------------ */

type RouteHandler = (
  req: NextRequest,
  ...args: unknown[]
) => Promise<NextResponse> | NextResponse;

type AuthRouteHandler = (
  req: NextRequest,
  user: AuthUser,
  ...args: unknown[]
) => Promise<NextResponse> | NextResponse;

/**
 * `withAuth(handler)` — validates session, clears cookie on failure,
 * then calls handler with `(req, user, ...)`.
 *
 * Usage:
 *   export const GET = withAuth(async (req, user, context) => {
 *     const { id } = await context.params;
 *     …
 *   });
 */
export function withAuth(handler: AuthRouteHandler): RouteHandler {
  return async (req, ...args) => {
    const user = await getSession();
    if (!user) {
      return unauthorizedResponse();
    }
    return handler(req, user, ...args);
  };
}

/**
 * `withRole(roles)(handler)` — validates session + role gate.
 *
 * Usage:
 *   export const GET = withRole(["superadmin"])(async (req, user) => { … });
 *
 * Future permission-manager task — swap for `withPermission("…")`.
 */
export function withRole(
  allowedRoles: Array<"superadmin" | "admin" | "member">
) {
  return (handler: AuthRouteHandler): RouteHandler => {
    return async (req, ...args) => {
      const user = await getSession();
      if (!user) {
        return unauthorizedResponse();
      }
      try {
        requireRole(user, allowedRoles);
      } catch {
        return forbiddenResponse();
      }
      return handler(req, user, ...args);
    };
  };
}
