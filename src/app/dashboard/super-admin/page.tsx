import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SuperAdminClient from "./SuperAdminClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const currentUser = await getSession();
  if (!currentUser || currentUser.role !== "superadmin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          System-wide management, monitoring, and audit tools
        </p>
      </div>
      <SuperAdminClient />
    </div>
  );
}
