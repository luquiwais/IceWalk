import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The design system is shipped as TypeScript source from packages/ui.
  transpilePackages: ["@icewalk/ui"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // Monorepo: the root must contain both apps/web and packages/ui.
    root: path.join(__dirname, "..", ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
