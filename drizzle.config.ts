import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// In production (Deno Deploy), DATABASE_URL is injected by the platform.
// Only load local .env for development to avoid overriding injected vars.
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env" });
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});