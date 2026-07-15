import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Prevent Next from picking a parent lockfile as the workspace root
    root: process.cwd(),
  },
};

export default nextConfig;
