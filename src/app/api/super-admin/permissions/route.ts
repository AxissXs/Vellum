import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const roles = [
  {
    id: "superadmin",
    name: "Super Admin",
    description: "Full system control. Can manage everything including other admins.",
  },
  {
    id: "admin",
    name: "Admin",
    description: "Can manage users, teams, projects, and tasks. Cannot manage super admins or system-level settings.",
  },
  {
    id: "member",
    name: "Member",
    description: "Standard user. Can view and work on assigned tasks and projects.",
  },
];

const permissions = [
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
  { id: "view_audit_logs", label: "View Audit Logs", category: "Super Admin" },
  { id: "export_audit_logs", label: "Export Audit Logs", category: "Super Admin" },
  { id: "view_sessions", label: "View Active Sessions", category: "Super Admin" },
  { id: "revoke_sessions", label: "Revoke Sessions", category: "Super Admin" },
  { id: "view_system_health", label: "View System Health", category: "Super Admin" },
  { id: "manage_roles", label: "Manage Roles", category: "Super Admin" },
];

const rolePermissions: Record<string, string[]> = {
  superadmin: permissions.map((p) => p.id),
  admin: [
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
  ],
  member: [
    "view_dashboard",
    "view_teams",
    "view_projects",
    "view_tasks",
    "create_tasks",
    "edit_tasks",
    "delete_tasks",
    "assign_tasks",
  ],
};

export async function GET() {
  const currentUser = await getSession();
  try {
    requireRole(currentUser, ["superadmin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    roles,
    permissions,
    rolePermissions,
  });
}
