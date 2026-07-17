import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession, IMPERSONATOR_SESSION_COOKIE } from "@/lib/auth";
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

  const cookieStore = await cookies();
  const isImpersonating = !!cookieStore.get(IMPERSONATOR_SESSION_COOKIE)?.value;

  return (
    <ClientLayout user={user} isImpersonating={isImpersonating}>
      {children}
    </ClientLayout>
  );
}