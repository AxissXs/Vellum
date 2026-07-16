import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    roles: ROLES,
    permissions: PERMISSIONS,
    rolePermissions: ROLE_PERMISSIONS,
  });
}
