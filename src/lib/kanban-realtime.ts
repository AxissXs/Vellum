import type { TaskUpdatePayload } from "@/hooks/useRealtime";

export type KanbanTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  position: string;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  projectName?: string | null;
  projectColor?: string | null;
};

export type KanbanColumn = {
  key: string;
  label: string;
  color: string;
  tasks: KanbanTask[];
};

function normalizeTask(raw: Record<string, unknown>): KanbanTask | null {
  if (typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  const status = typeof raw.status === "string" ? raw.status : "todo";
  return {
    id: raw.id,
    title: raw.title,
    description: (raw.description as string | null) ?? null,
    status,
    priority: typeof raw.priority === "string" ? raw.priority : "medium",
    projectId: typeof raw.projectId === "string" ? raw.projectId : "",
    assigneeId: (raw.assigneeId as string | null) ?? null,
    creatorId: typeof raw.creatorId === "string" ? raw.creatorId : "",
    dueDate: (raw.dueDate as string | null) ?? null,
    position: typeof raw.position === "string" ? raw.position : "0",
    createdAt:
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : new Date().toISOString(),
    assigneeName: (raw.assigneeName as string | null) ?? null,
    assigneeAvatar: (raw.assigneeAvatar as string | null) ?? null,
    projectName: (raw.projectName as string | null | undefined) ?? null,
    projectColor: (raw.projectColor as string | null | undefined) ?? null,
  };
}

/**
 * Apply a Pusher task-event to local Kanban columns (other users' changes).
 * Returns the same reference if nothing changed.
 */
export function applyTaskEventToColumns(
  columns: KanbanColumn[],
  payload: TaskUpdatePayload,
  options?: { projectId?: string }
): KanbanColumn[] {
  const eventProjectId = payload.projectId || payload.task?.projectId;
  if (
    options?.projectId &&
    eventProjectId &&
    eventProjectId !== options.projectId
  ) {
    return columns;
  }

  if (payload.type === "deleted" && payload.taskId) {
    const taskId = payload.taskId;
    if (!columns.some((c) => c.tasks.some((t) => t.id === taskId))) {
      return columns;
    }
    return columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.id !== taskId),
    }));
  }

  if (payload.type === "reordered" && payload.updates?.length) {
    const byId = new Map(payload.updates.map((u) => [u.id, u]));
    let changed = false;
    const next = columns.map((col) => {
      const tasks = col.tasks.map((t) => {
        const u = byId.get(t.id);
        if (!u) return t;
        changed = true;
        return {
          ...t,
          position: u.position,
          status: u.status || t.status,
        };
      });
      return { ...col, tasks };
    });

    // Re-bucket by status after position/status updates
    if (!changed) return columns;
    const allTasks = next.flatMap((c) => c.tasks);
    return next.map((col) => ({
      ...col,
      tasks: allTasks
        .filter((t) => t.status === col.key)
        .sort((a, b) => Number(a.position) - Number(b.position)),
    }));
  }

  if (
    (payload.type === "created" || payload.type === "updated") &&
    payload.task
  ) {
    const task = normalizeTask(payload.task as unknown as Record<string, unknown>);
    if (!task) return columns;
    if (options?.projectId && task.projectId !== options.projectId) {
      return columns;
    }

    const without = columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.id !== task.id),
    }));

    return without.map((col) => {
      if (col.key !== task.status) return col;
      const tasks = [...col.tasks, task].sort(
        (a, b) => Number(a.position) - Number(b.position)
      );
      return { ...col, tasks };
    });
  }

  return columns;
}
