import { and, asc, eq, gte, lte, ne, sql, ilike } from "drizzle-orm";
import { db } from "@/db";
import { projects, tasks, users } from "@/db/schema";

export type TaskListFilters = {
  projectId?: string;
  status?: string;
  assigneeId?: string;
  sprintId?: string;
  excludeDone?: boolean;
  dueFrom?: Date;
  dueTo?: Date;
  projectName?: string;
  limit?: number;
  offset?: number;
};

const taskSelect = {
  id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  priority: tasks.priority,
  projectId: tasks.projectId,
  assigneeId: tasks.assigneeId,
  creatorId: tasks.creatorId,
  dueDate: tasks.dueDate,
  position: tasks.position,
  sprintId: tasks.sprintId,
  estimate: tasks.estimate,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
  assigneeName: users.name,
  assigneeAvatar: users.avatarUrl,
  projectName: projects.name,
};

export async function queryTasks(filters: TaskListFilters = {}) {
  const conditions = [];

  if (filters.projectId) conditions.push(eq(tasks.projectId, filters.projectId));
  if (filters.status) conditions.push(eq(tasks.status, filters.status as never));
  if (filters.assigneeId) conditions.push(eq(tasks.assigneeId, filters.assigneeId));
  if (filters.sprintId) conditions.push(eq(tasks.sprintId, filters.sprintId));
  if (filters.excludeDone) conditions.push(ne(tasks.status, "done"));
  if (filters.dueFrom) {
    conditions.push(
      and(sql`${tasks.dueDate} IS NOT NULL`, gte(tasks.dueDate, filters.dueFrom))
    );
  }
  if (filters.dueTo) {
    conditions.push(
      and(sql`${tasks.dueDate} IS NOT NULL`, lte(tasks.dueDate, filters.dueTo))
    );
  }
  if (filters.projectName) {
    conditions.push(ilike(projects.name, `%${filters.projectName}%`));
  }

  const base = db
    .select(taskSelect)
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(tasks.dueDate), asc(tasks.position), asc(tasks.createdAt));

  if (filters.limit != null && filters.offset != null) {
    return base.limit(filters.limit).offset(filters.offset);
  }
  if (filters.limit != null) {
    return base.limit(filters.limit);
  }
  return base;
}

export async function getTaskById(taskId: string) {
  const [row] = await db
    .select(taskSelect)
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, taskId))
    .limit(1);
  return row ?? null;
}

export async function resolveTaskRef(
  ref: string,
  assigneeId?: string
): Promise<{
  task: Awaited<ReturnType<typeof getTaskById>> | null;
  ambiguous?: Awaited<ReturnType<typeof queryTasks>>;
}> {
  const trimmed = ref.trim();
  if (!trimmed) return { task: null };

  const uuidLike = /^[0-9a-f-]{8,}$/i.test(trimmed);
  if (uuidLike && trimmed.length >= 8) {
    const rows = await queryTasks({
      assigneeId,
      excludeDone: true,
    });
    const matches = rows.filter((t) => t.id.startsWith(trimmed.toLowerCase()));
    if (matches.length === 1) {
      return { task: matches[0] };
    }
    if (matches.length > 1) {
      return { task: null, ambiguous: matches };
    }
  }

  const byExact = await getTaskById(trimmed);
  if (byExact) return { task: byExact };

  const rows = await queryTasks({
    assigneeId,
    excludeDone: true,
  });
  const lower = trimmed.toLowerCase();
  const titleMatches = rows.filter((t) =>
    t.title.toLowerCase().includes(lower)
  );
  if (titleMatches.length === 1) {
    return { task: titleMatches[0] };
  }
  if (titleMatches.length > 1) {
    return { task: null, ambiguous: titleMatches };
  }

  return { task: null };
}

export async function resolveUsersByTelegramRef(ref: string) {
  const trimmed = ref.replace(/^@/, "").trim().toLowerCase();
  if (!trimmed) return [];

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      avatarUrl: users.avatarUrl,
      telegramUsername: users.telegramUsername,
    })
    .from(users)
    .where(eq(users.status, "active"));

  return rows.filter(
    (u) =>
      u.telegramUsername?.toLowerCase() === trimmed ||
      u.name.toLowerCase().includes(trimmed) ||
      u.email.toLowerCase().startsWith(trimmed)
  );
}

export async function resolveUserByTelegramRef(ref: string) {
  const matches = await resolveUsersByTelegramRef(ref);
  return matches[0] ?? null;
}
