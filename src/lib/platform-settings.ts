import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getPlatformSetting(key: string): Promise<string | null> {
  if (typeof window !== "undefined") return null;
  const rows = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setPlatformSetting(key: string, value: string | null) {
  if (typeof window !== "undefined") return;
  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(platformSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(platformSettings.id, existing[0].id));
  } else {
    await db.insert(platformSettings).values({ key, value });
  }
}
