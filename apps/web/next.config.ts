import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The corner badge overlaps the workspace's Settings link.
  devIndicators: false,
  experimental: {
    useTypeScriptCli: true,
  },
  agentRules: false,
  // The optional MCP server owns agent connections and each tab's command stream.
  // Saved sessions are this app's own routes under /api/sessions.
  async rewrites() {
    const server = process.env.GB_SERVER_URL ?? "http://127.0.0.1:3001";
    return [
      { source: "/mcp", destination: `${server}/mcp` },
      { source: "/rpc/:id", destination: `${server}/rpc/:id` },
    ];
  },
};

export default nextConfig;
