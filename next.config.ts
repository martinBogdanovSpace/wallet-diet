import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // End-to-end tests build into their own folder, so they never mix with `next dev` or the real build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
