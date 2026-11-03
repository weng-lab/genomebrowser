import { getVercelOidcToken } from "@vercel/oidc";

/** Calls stay on this deployment, rather than a branch alias that can change underneath a turn. */
export function agentAppOrigin() {
  return (
    process.env.GB_AGENT_APP_ORIGIN?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/** Workload identity passes Preview Deployment Protection; it does NOT authorize a user. */
export async function agentDeploymentHeaders(): Promise<Record<string, string>> {
  return process.env.VERCEL
    ? { "x-vercel-trusted-oidc-idp-token": await getVercelOidcToken() }
    : {};
}
