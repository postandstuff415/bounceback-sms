import type { NextConfig } from "next";

const isExport = process.env.EXPORT_MODE === "true";

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
