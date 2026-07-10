import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  missing: "Email and password are required.",
  invalid: "Invalid email or password.",
  server: "Something went wrong while signing you in. Please try again.",
};

async function isInitialized() {
  const existingUsers = await db.select({ count: users.id }).from(users).limit(1);
  return existingUsers.length > 0;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  if (user) redirect("/dashboard");

  const params = await searchParams;
  const initialError = params.error ? errorMessages[params.error] || "Login failed." : "";

  // In production, check if workspace is initialized
  if (process.env.NODE_ENV === "production") {
    const initialized = await isInitialized();
    if (!initialized) {
      redirect("/setup");
    }
  }

  return <LoginForm initialError={initialError} isDev={process.env.NODE_ENV === "development"} />;
}
