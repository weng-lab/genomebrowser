import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  // The corner badge overlaps the workspace's Settings link.
  devIndicators: false,
  allowedDevOrigins: process.env.GB_DEV_HOSTS?.split(",")
    .map((host) => host.trim())
    .filter(Boolean),
  experimental: {
    useTypeScriptCli: true,
  },
  agentRules: false,
};

// The Eve agent lives in `agent/`, next to this file.
export default withEve(nextConfig);
