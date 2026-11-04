import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The corner badge overlaps the workspace's Settings link.
  devIndicators: false,
  experimental: {
    useTypeScriptCli: true,
  },
  agentRules: false,
};

export default nextConfig;
