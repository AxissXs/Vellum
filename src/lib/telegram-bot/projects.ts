import { eq, asc, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";

export async function listActiveProjects() {
  return db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.archived, false), isNull(projects.deletedAt)))
    .orderBy(asc(projects.name));
}

export async function resolveProjectByName(name: string) {
  const rows = await listActiveProjects();
  const lower = name.trim().toLowerCase();
  const exact = rows.filter((p) => p.name.toLowerCase() === lower);
  if (exact.length === 1) return { project: exact[0] };
  const partial = rows.filter((p) => p.name.toLowerCase().includes(lower));
  if (partial.length === 1) return { project: partial[0] };
  if (partial.length > 1) return { ambiguous: partial };
  return { project: null };
}
