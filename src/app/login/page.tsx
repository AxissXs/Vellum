import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  missing: "Email and password are required.",
  invalid: "Invalid email or password. Try a demo account with password123.",
  server: "Something went wrong while signing you in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  if (user) redirect("/dashboard");

  const params = await searchParams;
  const initialError = params.error ? errorMessages[params.error] || "Login failed." : "";

  return <LoginForm initialError={initialError} />;
}
