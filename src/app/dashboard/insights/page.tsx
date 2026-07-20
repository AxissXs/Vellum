import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loadTeamInsights } from "@/lib/dashboard-insights";
import InsightsClient from "./InsightsClient";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    redirect("/dashboard");
  }

  const data = await loadTeamInsights();
  return <InsightsClient data={data} user={user} />;
}
