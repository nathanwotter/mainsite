import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const showNextDevIndicator = process.env.NEXT_PUBLIC_SHOW_NEXT_DEV_INDICATOR === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: appDir,
  devIndicators: showNextDevIndicator ? { position: "bottom-left" } : false,
};

export default nextConfig;
