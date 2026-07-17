import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Absolute path to this package (next.config.ts location) — not process.cwd(),
// which can differ from the config dir depending on how Next is launched.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin tracing to this package so standalone does not nest under a parent
  // directory when a higher package-lock.json exists (e.g. ~/package-lock.json).
  outputFileTracingRoot: projectRoot,
  // Ensure drizzle SQL lands inside standalone for runtime migrations
  // (Deno Deploy pre-deploy cannot reliably see custom files).
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  // Keep Node-only packages out of bundles — they must run server-side only.
  serverExternalPackages: ["web-push", "pusher", "bcryptjs", "pg"],
  // Do NOT set turbopack.root to projectRoot. Next.js bug:
  // https://github.com/vercel/next.js/issues/90307 — CSS @import then
  // resolves from the *parent* directory and fails to find tailwindcss
  // (exactly the ".../rnd/Vellum" path in the error).
  //
  // Parent ~/package-lock.json still makes Turbopack warn about workspace
  // root; pin critical CSS deps via absolute aliases instead.
  turbopack: {
    resolveAlias: {
      tailwindcss: path.join(projectRoot, "node_modules/tailwindcss"),
      "@tailwindcss/postcss": path.join(
        projectRoot,
        "node_modules/@tailwindcss/postcss"
      ),
    },
  },
};

export default nextConfig;
