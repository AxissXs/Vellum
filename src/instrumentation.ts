export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Run in production (Deno Deploy) and when explicitly forced locally.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.RUN_MIGRATIONS_ON_START !== "1"
  ) {
    return;
  }

  try {
    const { runMigrations } = await import("@/db/run-migrations");
    await runMigrations();
  } catch (err) {
    console.error("[db] Startup migration failed:", err);
    // Fail boot in production so we never serve against a stale schema.
    if (process.env.NODE_ENV === "production") throw err;
  }
}
