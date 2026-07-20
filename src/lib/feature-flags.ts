import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";

const FLAG_CACHE_TTL = 60_000; // 60 seconds
let flagCache: Map<string, boolean> | null = null;
let cacheTimestamp = 0;

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getAllFlags();
  return flags.get(key) ?? false;
}

export async function getAllFlags(): Promise<Map<string, boolean>> {
  const now = Date.now();
  if (flagCache && now - cacheTimestamp < FLAG_CACHE_TTL) {
    return flagCache;
  }

  const rows = await db.select().from(featureFlags);
  const map = new Map(rows.map((r) => [r.key, r.enabled]));
  flagCache = map;
  cacheTimestamp = now;
  return map;
}

export function invalidateFlagCache(): void {
  flagCache = null;
  cacheTimestamp = 0;
}
