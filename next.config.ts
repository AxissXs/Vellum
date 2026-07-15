import type { NextConfig } from "next";
import path from "path";

const root = process.cwd();

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Keep Turbopack (next dev) rooted at this project, not a parent lockfile
    root,
  },
  webpack: (config) => {
    // webpack infers the project root from a lockfile and can walk up to a
    // parent package-lock.json (e.g. /Users/azlanshah/package-lock.json),
    // breaking module resolution for locally-installed deps like tailwindcss.
    // Pin resolve roots + module dir to this project so node_modules resolves here.
    config.resolve.roots = [root, ...(config.resolve.roots ?? [])];
    config.resolve.modules = [
      path.join(root, "node_modules"),
      ...(config.resolve.modules ?? []),
    ];
    return config;
  },
};

export default nextConfig;
