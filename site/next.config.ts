import type { NextConfig } from "next";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["boubakikid"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      boubakikid: resolve(__dirname, "../dist/index.js"),
    };
    return config;
  },
};

export default nextConfig;
