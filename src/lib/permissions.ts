/**
 * Client-safe permission matrix. Do NOT import from `@/lib/auth` here —
 * client components import this module and auth pulls in `next/headers`.
 */

export type PermissionId =
  | "view_dashboard"
  | "view_users"
  | "create_users"
  | "edit_users"
  | "delete_users"
  | "change_user_status"
  | "view_teams"
  | "create_teams"
  | "edit_teams"
  | "delete_teams"
  | "manage_team_members"
  | "view_projects"
  | "create_projects"
  | "edit_projects"
  | "delete_projects"
  | "view_tasks"
  | "create_tasks"
  | "edit_tasks"
  | "delete_tasks"
  | "assign_tasks"
  | "view_sprints"
  | "create_sprints"
  | "edit_sprints"
  | "delete_sprints"
  | "complete_sprint"
  | "view_audit_logs"
  | "export_audit_logs"
  | "view_sessions"
  | "revoke_sessions"
  | "view_system_health"
  | "manage_roles";

export type RoleId = "superadmin" | "admin" | "member";

export const ROLES: Array<{
  id: RoleId;
  name: string;
  description: string;
}> = [
  {
    id: "superadmin",
    name: "Super Admin",
    description:
      "Full system control. Can manage everything including other admins.",
  },
  {
    id: "admin",
    name: "Admin",
    description:
      "Can manage users, teams, projects, and tasks. Cannot manage super admins or system-level settings.",
  },
  {
    id: "member",
    name: "Member",
    description: "Standard user. Can view and work on assigned tasks and projects.",
  },
];

export const PERMISSIONS: Array<{
  id: PermissionId;
  label: string;
  category: string;
}> = [
  { id: "view_dashboard", label: "View Dashboard", category: "General" },
  { id: "view_users", label: "View Users", category: "Users" },
  { id: "create_users", label: "Create Users", category: "Users" },
  { id: "edit_users", label: "Edit Users", category: "Users" },
  { id: "delete_users", label: "Delete Users", category: "Users" },
  { id: "change_user_status", label: "Change User Status", category: "Users" },
  { id: "view_teams", label: "View Teams", category: "Teams" },
  { id: "create_teams", label: "Create Teams", category: "Teams" },
  { id: "edit_teams", label: "Edit Teams", category: "Teams" },
  { id: "delete_teams", label: "Delete Teams", category: "Teams" },
  { id: "manage_team_members", label: "Manage Team Members", category: "Teams" },
  { id: "view_projects", label: "View Projects", category: "Projects" },
  { id: "create_projects", label: "Create Projects", category: "Projects" },
  { id: "edit_projects", label: "Edit Projects", category: "Projects" },
  { id: "delete_projects", label: "Delete Projects", category: "Projects" },
  { id: "view_tasks", label: "View Tasks", category: "Tasks" },
  { id: "create_tasks", label: "Create Tasks", category: "Tasks" },
  { id: "edit_tasks", label: "Edit Tasks", category: "Tasks" },
  { id: "delete_tasks", label: "Delete Tasks", category: "Tasks" },
  { id: "assign_tasks", label: "Assign Tasks", category: "Tasks" },
  { id: "view_sprints", label: "View Sprints", category: "Sprints" },
  { id: "create_sprints", label: "Create Sprints", category: "Sprints" },
  { id: "edit_sprints", label: "Edit Sprints", category: "Sprints" },
  { id: "delete_sprints", label: "Delete Sprints", category: "Sprints" },
  { id: "complete_sprint", label: "Complete Sprint", category: "Sprints" },
  { id: "view_audit_logs", label: "View Audit Logs", category: "Super Admin" },
  { id: "export_audit_logs", label: "Export Audit Logs", category: "Super Admin" },
  { id: "view_sessions", label: "View Active Sessions", category: "Super Admin" },
  { id: "revoke_sessions", label: "Revoke Sessions", category: "Super Admin" },
  { id: "view_system_health", label: "View System Health", category: "Super Admin" },
  { id: "manage_roles", label: "Manage Roles", category: "Super Admin" },
];

const ADMIN_PERMISSIONS: PermissionId[] = [
  "view_dashboard",
  "view_users",
  "create_users",
  "edit_users",
  "view_teams",
  "create_teams",
  "edit_teams",
  "delete_teams",
  "manage_team_members",
  "view_projects",
  "create_projects",
  "edit_projects",
  "delete_projects",
  "view_tasks",
  "create_tasks",
  "edit_tasks",
  "delete_tasks",
  "assign_tasks",
  "view_sprints",
  "create_sprints",
  "edit_sprints",
  "delete_sprints",
  "complete_sprint",
];

const MEMBER_PERMISSIONS: PermissionId[] = [
  "view_dashboard",
  "view_teams",
  "view_projects",
  "view_tasks",
  "create_tasks",
  "edit_tasks",
  "delete_tasks",
  "assign_tasks",
  "view_sprints",
];

export const ROLE_PERMISSIONS: Record<RoleId, PermissionId[]> = {
  superadmin: PERMISSIONS.map((p) => p.id),
  admin: ADMIN_PERMISSIONS,
  member: MEMBER_PERMISSIONS,
};

export function hasPermission(
  role: RoleId | string | null | undefined,
  permission: PermissionId
): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) return false;
  return ROLE_PERMISSIONS[role as RoleId].includes(permission);
}

export function requirePermission(
  user: { id: string; role: string } | null,
  permission: PermissionId
): asserts user is { id: string; role: string } {
  if (!user) throw new Error("Unauthorized");
  if (!hasPermission(user.role, permission)) {
    throw new Error("Forbidden");
  }
}

/** Author or admin+ may mutate; used for retro items. */
export function canMutateOwned(
  user: { id: string; role: string },
  authorId: string | null
): boolean {
  if (user.role === "superadmin" || user.role === "admin") return true;
  return authorId !== null && authorId === user.id;
}
