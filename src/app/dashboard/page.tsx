import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loadPersonalDashboard } from "@/lib/dashboard-personal";
import PersonalDashboard from "@/components/dashboard/PersonalDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const data = await loadPersonalDashboard(user);
  return <PersonalDashboard data={data} user={user} />;
}
