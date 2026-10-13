import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The corner badge overlaps the workspace's Settings link.
  devIndicators: false,
  experimental: {
    useTypeScriptCli: true,
  },
  transpilePackages: ["@weng-lab/browser-server"],
  agentRules: false,
  // The browser server owns the API, tab connections, and MCP; this app only forwards to it.
  async rewrites() {
    const server = process.env.GB_SERVER_URL ?? "http://127.0.0.1:3001";
    return [
      { source: "/api/:path*", destination: `${server}/api/:path*` },
      { source: "/mcp", destination: `${server}/mcp` },
    ];
  },
};

export default nextConfig;
