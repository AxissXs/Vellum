import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users, projects, tasks, teams } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await getSession();
  if (!currentUser || (currentUser.role !== "superadmin" && currentUser.role !== "admin")) {
    redirect("/dashboard");
  }

  const [userRows, [projectCount], [taskCount], [teamCount]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.name),
    db.select({ count: sql<number>`count(*)::int` }).from(projects),
    db.select({ count: sql<number>`count(*)::int` }).from(tasks),
    db.select({ count: sql<number>`count(*)::int` }).from(teams),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage users and system settings
          {currentUser.role === "superadmin" && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
              Superadmin
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-3xl font-bold text-slate-900">{userRows.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total Users</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-3xl font-bold text-slate-900">{projectCount.count}</p>
          <p className="text-xs text-slate-500 mt-1">Total Projects</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-3xl font-bold text-slate-900">{taskCount.count}</p>
          <p className="text-xs text-slate-500 mt-1">Total Tasks</p>
        </div>
      </div>

      {/* User Management */}
      <div>
        <AdminClient
          initialUsers={JSON.parse(JSON.stringify(userRows))}
          currentUserRole={currentUser.role}
        />
      </div>
    </div>
  );
}
