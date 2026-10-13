import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
  allowedDevOrigins: ["arch.crane-tawny.ts.net"],
};

export default nextConfig;
