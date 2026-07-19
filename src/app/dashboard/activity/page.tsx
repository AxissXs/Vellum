import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import ActivityClient from "./ActivityClient";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      }
    >
      <ActivityClient />
    </Suspense>
  );
}
