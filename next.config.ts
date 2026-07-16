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
  // Keep Node-only packages out of Turbopack page-data bundles (Deno Deploy
  // builds have hit "module factory is not available" during /_not-found).
  serverExternalPackages: ["web-push", "pusher"],
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
  webpack: (config) => {
    // webpack can also walk up to a parent package-lock.json and break
    // resolution for locally-installed deps. Pin to this project.
    config.resolve.roots = [projectRoot, ...(config.resolve.roots ?? [])];
    config.resolve.modules = [
      path.join(projectRoot, "node_modules"),
      ...(config.resolve.modules ?? []),
    ];
    return config;
  },
};

export default nextConfig;
