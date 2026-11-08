import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 純靜態輸出：沒有後端，可以放 Cloudflare Pages 或任何靜態主機
  output: "export",
  // 發佈成 artifact 時，根目錄的 _ 開頭路徑被保留，所以把 _next 放到 assets/ 底下
  assetPrefix: process.env.ASSET_PREFIX || undefined,
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
