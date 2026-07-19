import { eq, gte, desc, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { retroItems, sprints } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export type RetroCategory = "went_well" | "went_wrong" | "action_item";

export async function createRetroItemForUser(
  user: AuthUser,
  sprintId: string,
  category: RetroCategory,
  content: string
) {
  const validCategories: RetroCategory[] = ["went_well", "went_wrong", "action_item"];
  if (!validCategories.includes(category)) {
    throw new Error("Invalid category");
  }

  const [item] = await db
    .insert(retroItems)
    .values({
      sprintId,
      authorId: user.id,
      category,
      content,
    })
    .returning();

  logActivity({
    userId: user.id,
    action: "created_retro_item",
    entityType: "retro",
    entityId: item.id,
    details: `Added retro item (${category})`,
  });

  return item;
}

export async function queryActiveSprints() {
  const now = new Date();
  return db
    .select()
    .from(sprints)
    .where(or(isNull(sprints.endDate), gte(sprints.endDate, now)))
    .orderBy(desc(sprints.endDate));
}

export async function getSprintById(sprintId: string) {
  const [row] = await db
    .select()
    .from(sprints)
    .where(eq(sprints.id, sprintId))
    .limit(1);
  return row ?? null;
}
