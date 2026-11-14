import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack for stability with current dependencies
  // turbo: {
  //   rules: {
  //     "*.css": {
  //       loaders: ["@tailwindcss/turbopack"],
  //       as: "*.css",
  //     },
  //   },
  // },
};

export default nextConfig;