import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAppTimezone } from "@/lib/timezone-server";
import ClientLayout from "./ClientLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const timezone = await getAppTimezone();

  return (
    <ClientLayout user={user} timezone={timezone}>
      {children}
    </ClientLayout>
  );
}
