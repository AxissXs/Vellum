import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
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

  return (
    <ClientLayout user={user}>{children}</ClientLayout>
  );
}