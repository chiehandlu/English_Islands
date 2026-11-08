import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 純靜態輸出：沒有後端，可以放 Cloudflare Pages 或任何靜態主機
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
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
