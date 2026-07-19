import type { ElementType } from "react";
import {
  Activity,
  Calendar,
  CheckSquare,
  Flag,
  FolderKanban,
  MessageSquare,
  Settings,
  Users,
  Zap,
} from "lucide-react";

export const ENTITY_TYPES = [
  "project",
  "task",
  "comment",
  "sprint",
  "milestone",
  "schedule",
  "standup",
  "retro",
  "platform",
  "team",
  "note",
  "teamMember",
] as const;

export type ActivityEntityType = (typeof ENTITY_TYPES)[number] | string;

const actionIcons: Record<string, ElementType> = {
  created_project: FolderKanban,
  updated_project: FolderKanban,
  deleted_project: FolderKanban,
  restored_project: FolderKanban,
  created_task: CheckSquare,
  updated_task: CheckSquare,
  deleted_task: CheckSquare,
  restored_task: CheckSquare,
  completed_task: CheckSquare,
  started_task: CheckSquare,
  changed_task_status: CheckSquare,
  created_comment: MessageSquare,
  updated_comment: MessageSquare,
  deleted_comment: MessageSquare,
  restored_comment: MessageSquare,
  created_sprint: Zap,
  updated_sprint: Zap,
  deleted_sprint: Zap,
  created_milestone: Flag,
  updated_milestone: Flag,
  deleted_milestone: Flag,
  restored_milestone: Flag,
  created_schedule: Calendar,
  updated_schedule: Calendar,
  deleted_schedule: Calendar,
  created_standup: Users,
  created_retro_item: MessageSquare,
  updated_retro_item: MessageSquare,
  deleted_retro_item: MessageSquare,
  updated_timezone: Settings,
  updated_holiday_country: Settings,
  restored_team: Users,
  restored_note: MessageSquare,
  restored_teamMember: Users,
};

const actionColors: Record<string, string> = {
  created_project: "bg-brand-500/10 text-brand-600",
  updated_project: "bg-blue-500/10 text-blue-600",
  deleted_project: "bg-red-500/10 text-red-600",
  restored_project: "bg-emerald-500/10 text-emerald-600",
  created_task: "bg-emerald-500/10 text-emerald-600",
  updated_task: "bg-amber-500/10 text-amber-600",
  deleted_task: "bg-red-500/10 text-red-600",
  restored_task: "bg-emerald-500/10 text-emerald-600",
  completed_task: "bg-emerald-500/10 text-emerald-600",
  started_task: "bg-blue-500/10 text-blue-600",
  changed_task_status: "bg-purple-500/10 text-purple-600",
  created_comment: "bg-sky-500/10 text-sky-600",
  updated_comment: "bg-sky-500/10 text-sky-600",
  deleted_comment: "bg-red-500/10 text-red-600",
  created_sprint: "bg-violet-500/10 text-violet-600",
  updated_sprint: "bg-violet-500/10 text-violet-600",
  deleted_sprint: "bg-red-500/10 text-red-600",
  created_milestone: "bg-orange-500/10 text-orange-600",
  updated_milestone: "bg-orange-500/10 text-orange-600",
  deleted_milestone: "bg-red-500/10 text-red-600",
  created_schedule: "bg-teal-500/10 text-teal-600",
  updated_schedule: "bg-teal-500/10 text-teal-600",
  deleted_schedule: "bg-red-500/10 text-red-600",
  created_standup: "bg-indigo-500/10 text-indigo-600",
  created_retro_item: "bg-pink-500/10 text-pink-600",
  updated_retro_item: "bg-pink-500/10 text-pink-600",
  deleted_retro_item: "bg-red-500/10 text-red-600",
  updated_timezone: "bg-slate-500/10 text-slate-600",
  updated_holiday_country: "bg-slate-500/10 text-slate-600",
};

const entityFallbackIcons: Record<string, ElementType> = {
  project: FolderKanban,
  task: CheckSquare,
  comment: MessageSquare,
  sprint: Zap,
  milestone: Flag,
  schedule: Calendar,
  standup: Users,
  retro: MessageSquare,
  platform: Settings,
  team: Users,
  note: MessageSquare,
  teamMember: Users,
};

export function getActivityIcon(action: string, entityType?: string | null): ElementType {
  if (actionIcons[action]) return actionIcons[action];
  if (entityType && entityFallbackIcons[entityType]) {
    return entityFallbackIcons[entityType];
  }
  return Activity;
}

export function getActivityColor(action: string): string {
  return actionColors[action] || "bg-slate-500/10 text-slate-500";
}

export function entityHref(
  entityType: string | null | undefined,
  entityId: string | null | undefined
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "project":
      return `/dashboard/projects/${entityId}`;
    case "task":
      return `/dashboard/tasks?taskId=${entityId}`;
    case "sprint":
      return `/dashboard/sprints/${entityId}`;
    case "schedule":
      return "/dashboard/calendar";
    case "standup":
    case "retro":
      return "/dashboard/sprints";
    default:
      return null;
  }
}

export function formatActivityTimeAgo(dateStr: string, nowMs = Date.now()): string {
  const diff = nowMs - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function activityDayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

export function formatActivityDayLabel(dayKey: string, now = new Date()): string {
  const todayKey = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (dayKey === todayKey) return "Today";
  if (dayKey === yesterdayKey) return "Yesterday";
  return new Date(dayKey + "T00:00:00.000Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const severityStyles: Record<string, string> = {
  info: "bg-slate-200 text-slate-600",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};
