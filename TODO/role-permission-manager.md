# Role & Permission Manager

> **Priority:** High
> **Status:** Pending
> **Estimated complexity:** Large
> **Depends on:** Nothing

---

## Overview

Replace the fixed 3-role system (superadmin, admin, member) with a dynamic role and permission manager. Superadmins can create custom roles, assign granular permissions, and use permission presets when setting up roles. This turns the current display-only permission matrix into a fully enforced authorization system.

## Current State

### Database
- `users.role` uses a PostgreSQL enum `user_role` with 3 values: `superadmin`, `admin`, `member` (`src/db/schema.ts:10-14, 42`)
- No `roles` or `permissions` tables exist

### Auth System (`src/lib/auth.ts`)
- `AuthUser` type has `role: "superadmin" | "admin" | "member"` (line 14)
- `getSession()` loads user, returns `AuthUser` with role string (line 19-68)
- `requireRole(user, roles)` checks if user's role is in allowed array (line 132-140)
- No permission-based checks exist

### Permissions (display-only, NOT enforced)
- `GET /api/super-admin/permissions` returns hardcoded JSON with 26 permissions across 6 categories (`src/app/api/super-admin/permissions/route.ts:24-51`)
- Role-to-permission mapping is hardcoded in the same file (line 53-85)
- `SuperAdminRolesPanel` renders a read-only matrix table (`src/app/dashboard/super-admin/SuperAdminRolesPanel.tsx`)

### Where Role Checks Happen

**Pattern A: `requireRole()` (structured)**
| File | Line | Route | Allowed |
|------|------|-------|---------|
| `src/app/api/users/route.ts` | 30 | POST /api/users | superadmin, admin |
| `src/app/api/users/[id]/route.ts` | 14 | PATCH /api/users/[id] | superadmin, admin |
| `src/app/api/users/[id]/route.ts` | 55 | DELETE /api/users/[id] | superadmin |
| `src/app/api/super-admin/users/route.ts` | 12 | GET /api/super-admin/users | superadmin |
| `src/app/api/super-admin/users/[id]/route.ts` | 12 | PATCH /api/super-admin/users/[id] | superadmin |
| `src/app/api/super-admin/activity/route.ts` | 12 | GET /api/super-admin/activity | superadmin |
| `src/app/api/super-admin/sessions/route.ts` | 12 | GET /api/super-admin/sessions | superadmin |
| `src/app/api/super-admin/sessions/[id]/route.ts` | 12 | DELETE /api/super-admin/sessions/[id] | superadmin |
| `src/app/api/super-admin/audit/route.ts` | 12 | GET /api/super-admin/audit | superadmin |
| `src/app/api/super-admin/audit/export/route.ts` | 12 | GET /api/super-admin/audit/export | superadmin |
| `src/app/api/super-admin/health/route.ts` | 12 | GET /api/super-admin/health | superadmin |
| `src/app/api/super-admin/permissions/route.ts` | 90 | GET /api/super-admin/permissions | superadmin |

**Pattern B: Inline role string checks (ad-hoc)**
| File | Line | Route | Check |
|------|------|-------|-------|
| `src/app/api/teams/route.ts` | 48 | POST /api/teams | blocks member |
| `src/app/api/teams/[id]/route.ts` | 13 | PATCH /api/teams/[id] | blocks member |
| `src/app/api/teams/[id]/route.ts` | 41 | DELETE /api/teams/[id] | blocks non-superadmin |
| `src/app/api/teams/[id]/members/route.ts` | 13 | POST members | blocks member |
| `src/app/api/teams/[id]/members/route.ts` | 60 | DELETE members | blocks member |

**Pattern C: Server component page guards**
| File | Line | Guard |
|------|------|-------|
| `src/app/dashboard/admin/page.tsx` | 12 | blocks non-admin/superadmin |
| `src/app/dashboard/super-admin/page.tsx` | 9 | blocks non-superadmin |

**Pattern D: UI visibility (client-side)**
| File | Line | Behavior |
|------|------|----------|
| `src/components/Sidebar.tsx` | 44-49 | Admin link for admin/superadmin, Super Admin link for superadmin only |
| `src/app/dashboard/teams/page.tsx` | 62-63 | canManage/canDelete based on role |
| `src/app/dashboard/admin/page.tsx` | 38 | Conditional render for superadmin |

**Routes with NO role check** (any authenticated user can access):
- GET /api/users, GET/POST /api/projects, GET/PATCH/DELETE /api/projects/[id]
- GET/POST /api/tasks, GET/PATCH/DELETE /api/tasks/[id]
- GET/POST /api/comments, PATCH/DELETE /api/comments/[id]
- GET /api/activity, GET /api/stats, all push/milestone routes

---

## Database Changes

### New table: `roles`
```ts
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  permissions: text("permissions").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### New table: `permissionPresets`
```ts
export const permissionPresets = pgTable("permission_presets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  permissions: text("permissions").array().notNull().default([]),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Modified: `users.role`
- Change from `userRoleEnum("role")` to `text("role").notNull().default("member")`
- Still stores the role name as a string (e.g. "superadmin")
- Conceptual FK to `roles.name` — not enforced at DB level for auth speed

### Remove: `userRoleEnum`
- Delete the pgEnum definition at `src/db/schema.ts:10-14`
- Update any TypeScript types that reference it

---

## Seed Data

### System Roles (3, `isSystem: true`)
| name | description | permissions |
|------|-------------|-------------|
| superadmin | Full system control | All 26 permissions |
| admin | User/team/project management | 18 permissions (no super-admin perms, no delete_users, no change_user_status) |
| member | Standard user | 8 permissions (view_dashboard, view_teams, view_projects, view_tasks, create_tasks, edit_tasks, delete_tasks, assign_tasks) |

### Permission Presets
| name | category | permissions |
|------|----------|-------------|
| Full Admin | Administration | All 26 |
| User Manager | Administration | Users category + view perms |
| Project Manager | Projects | Projects + Tasks + Teams (view) |
| Developer | Tasks | All task perms + Projects (view) |
| Viewer | Read-Only | All view_* permissions |
| Team Lead | Teams | Teams + Tasks + Projects (view/edit) |

### Master Permission List (26 permissions, 6 categories)
Same as current hardcoded list in `src/app/api/super-admin/permissions/route.ts:24-51`:
- **General**: view_dashboard
- **Users**: view_users, create_users, edit_users, delete_users, change_user_status
- **Teams**: view_teams, create_teams, edit_teams, delete_teams, manage_team_members
- **Projects**: view_projects, create_projects, edit_projects, delete_projects
- **Tasks**: view_tasks, create_tasks, edit_tasks, delete_tasks, assign_tasks
- **Super Admin**: view_audit_logs, export_audit_logs, view_sessions, revoke_sessions, view_system_health, manage_roles

---

## Auth System Changes (`src/lib/auth.ts`)

### 1. Update `AuthUser` type
```ts
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;  // was: "superadmin" | "admin" | "member"
  status: "active" | "inactive" | "banned";
  avatarUrl: string | null;
  permissions: string[];  // NEW: loaded from roles table
};
```

### 2. Update `getSession()`
After loading the user, also load the role from the `roles` table and attach the permissions array:
```ts
// After loading user from DB:
const [roleRow] = await db
  .select()
  .from(roles)
  .where(eq(roles.name, user.role))
  .limit(1);

return {
  ...user,
  permissions: roleRow?.permissions ?? [],
} as AuthUser;
```

### 3. Add `requirePermission()` helper
```ts
export function requirePermission(
  user: AuthUser | null,
  permission: string
): asserts user is AuthUser {
  requireAuth(user);
  if (!user.permissions.includes(permission)) {
    throw new Error("Forbidden");
  }
}
```

### 4. Keep `requireRole()` for backward compatibility
Existing code continues to work. New code uses `requirePermission()`.

---

## API Routes

### Roles CRUD

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `GET` | `/api/super-admin/roles` | List all roles | requirePermission('manage_roles') |
| `POST` | `/api/super-admin/roles` | Create role | requirePermission('manage_roles') |
| `PATCH` | `/api/super-admin/roles/[id]` | Update role | requirePermission('manage_roles') |
| `DELETE` | `/api/super-admin/roles/[id]` | Delete role | requirePermission('manage_roles') |

**POST /api/super-admin/roles** body:
```json
{ "name": "Project Manager", "description": "...", "permissions": ["view_projects", "create_projects"] }
```

**Constraints:**
- Cannot delete roles with `isSystem: true`
- Cannot rename system roles
- Role name must be unique
- At least one role must have "manage_roles" permission (prevent lockout)

### Permission Presets CRUD

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `GET` | `/api/super-admin/permission-presets` | List all presets | requirePermission('manage_roles') |
| `POST` | `/api/super-admin/permission-presets` | Create preset | requirePermission('manage_roles') |
| `PATCH` | `/api/super-admin/permission-presets/[id]` | Update preset | requirePermission('manage_roles') |
| `DELETE` | `/api/super-admin/permission-presets/[id]` | Delete preset | requirePermission('manage_roles') |

### Updated existing routes

| Route | Change |
|-------|--------|
| `GET /api/super-admin/permissions` | Return master permission list from constants (keep as-is, no DB needed) |
| `PATCH /api/super-admin/users/[id]` | Allow setting `role` to any role name from the roles table |
| `POST /api/users` | Allow setting `role` to any role name from the roles table |

---

## UI Changes

### Rewrite: `SuperAdminRolesPanel.tsx`
Current file: `src/app/dashboard/super-admin/SuperAdminRolesPanel.tsx` (237 lines)

**Replace the read-only matrix with:**

1. **Role list view** — Cards/table showing all roles with: name, description, permission count, system badge, edit/delete actions
2. **Create role modal** — Form with:
   - Name input
   - Description textarea
   - "Apply Preset" dropdown (loads from permission-presets API)
   - Permission checkboxes grouped by category (same categories as current matrix)
   - Save/Cancel buttons
3. **Edit role modal** — Same as create, pre-filled. System roles: name/description editable, permissions editable, cannot delete
4. **Delete role confirmation** — Warns if users are assigned to this role. Block deletion of system roles
5. **Permission presets section** — Separate tab/section for managing presets (CRUD)

### User management updates

**`SuperAdminUsersPanel.tsx`** — Role dropdown should load from `GET /api/super-admin/roles` instead of hardcoding 3 options

**`src/app/api/users/[id]/route.ts`** — PATCH handler: validate that the new role exists in the `roles` table before setting it

### Client-side role checks
Replace `user.role === "superadmin"` with `user.permissions.includes("...")` where appropriate. Keep role string checks for simple cases (sidebar visibility), add permission checks for granular access.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/super-admin/roles/route.ts` | GET + POST roles |
| `src/app/api/super-admin/roles/[id]/route.ts` | PATCH + DELETE role |
| `src/app/api/super-admin/permission-presets/route.ts` | GET + POST presets |
| `src/app/api/super-admin/permission-presets/[id]/route.ts` | PATCH + DELETE preset |

## Files to Modify

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `roles` and `permissionPresets` tables, change `users.role` to text, remove `userRoleEnum` |
| `src/lib/auth.ts` | Add `permissions` to AuthUser, update `getSession()`, add `requirePermission()` |
| `src/app/dashboard/super-admin/SuperAdminRolesPanel.tsx` | Full rewrite: CRUD role management + presets |
| `src/app/dashboard/super-admin/SuperAdminUsersPanel.tsx` | Load roles from API for dropdown |
| `src/app/api/super-admin/permissions/route.ts` | Keep master list, remove hardcoded rolePermissions |
| `src/app/api/users/[id]/route.ts` | Validate role exists in roles table on PATCH |
| `src/app/api/users/route.ts` | Validate role exists in roles table on POST |
| All files with `requireRole()` calls | Gradually migrate to `requirePermission()` |
| All files with inline `user.role ===` checks | Gradually migrate to `user.permissions.includes()` |

---

## Migration Strategy

1. Create `roles` and `permissionPresets` tables
2. Seed 3 system roles + 6 presets
3. Change `users.role` column from enum to text (PG: `ALTER COLUMN role TYPE text USING role::text`)
4. Drop `user_role` enum type
5. Update `AuthUser` type and `getSession()` to load permissions
6. Add `requirePermission()` helper
7. Build roles/presets CRUD API routes
8. Rewrite `SuperAdminRolesPanel` with full CRUD UI
9. Update user management to use dynamic roles
10. Gradually replace `requireRole()` calls with `requirePermission()` calls
11. Run `bun run db:generate` + `bun run db:migrate`

---

## Activity Logging

Role mutations should log to `activity_logs`:
- `action: "created_role"`, `entityType: "role"`, `details: "Created role: {name}"`
- `action: "updated_role"`, `entityType: "role"`, `details: "Updated role: {name}"`
- `action: "deleted_role"`, `entityType: "role"`, `details: "Deleted role: {name}"`

---

## Acceptance Criteria

- [ ] Superadmin can create, edit, and delete custom roles
- [ ] System roles (superadmin, admin, member) cannot be deleted
- [ ] Permission presets can be created, edited, deleted
- [ ] When creating/editing a role, superadmin can apply a preset to bulk-select permissions
- [ ] Permission matrix is editable (checkboxes per permission per role)
- [ ] User role assignment uses dynamic roles from the database
- [ ] `requirePermission()` enforces authorization in API routes
- [ ] At least one role must always have `manage_roles` permission
- [ ] Activity logging works for role CRUD
- [ ] `bun run lint`, `bun run typecheck`, `bun run build` all pass

---

## Execution Order

1. DB schema changes + migration
2. Seed data script for system roles + presets
3. Auth system updates (permissions on AuthUser, requirePermission)
4. Roles CRUD API routes
5. Permission presets CRUD API routes
6. Rewrite SuperAdminRolesPanel UI
7. Update SuperAdminUsersPanel role dropdown
8. Update user creation/edit validation
9. Migrate existing requireRole/role checks to permission checks
10. Activity logging for role mutations
11. Lint, typecheck, build
