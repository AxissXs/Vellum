import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  missing: "Email and password are required.",
  invalid: "Invalid email or password.",
  server: "Something went wrong while signing you in. Please try again.",
};

async function isInitialized() {
  // Dynamic imports keep db/schema out of the static page module graph where
  // possible (Deno Deploy page-data collection is sensitive to Node natives).
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
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
