import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CalendarClient from "./CalendarClient";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
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
      <CalendarClient userId={user.id} userRole={user.role} />
    </Suspense>
  );
}
