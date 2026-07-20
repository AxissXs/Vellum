import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { invalidateFlagCache } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/feature-flags
 * Returns all feature flags with full metadata (superadmin only).
 */
export async function GET() {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db.select().from(featureFlags).orderBy(featureFlags.category, featureFlags.label);

  return NextResponse.json({ flags: rows });
}

type UpdatePayload = {
  updates: Array<{ key: string; enabled: boolean }>;
};

/**
 * PUT /api/super-admin/feature-flags
 * Update one or more flags. Invalidates the in-memory cache.
 */
export async function PUT(req: NextRequest) {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: UpdatePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body?.updates)) {
    return NextResponse.json({ error: "Missing updates array" }, { status: 400 });
  }

  const updatedKeys: string[] = [];
  const now = new Date();

  for (const update of body.updates) {
    if (!update.key || typeof update.enabled !== "boolean") {
      continue;
    }
    await db
      .update(featureFlags)
      .set({ enabled: update.enabled, updatedAt: now })
      .where(eq(featureFlags.key, update.key));
    updatedKeys.push(update.key);
  }

  // Invalidate cache immediately so next read is fresh
  invalidateFlagCache();

  // Refresh all flags for response
  const rows = await db.select().from(featureFlags).orderBy(featureFlags.category, featureFlags.label);
  return NextResponse.json({ flags: rows });
}
