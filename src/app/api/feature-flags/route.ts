import { NextResponse } from "next/server";
import { getAllFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

/**
 * Public endpoint that returns enabled feature flags.
 * No auth required — returns only key → boolean. Used by client for UI gating.
 */
export async function GET() {
  const flags = await getAllFlags();
  // Only return enabled flags
  const enabled: Record<string, boolean> = {};
  for (const [key, value] of flags.entries()) {
    enabled[key] = value;
  }
  return NextResponse.json({ flags: enabled });
}
