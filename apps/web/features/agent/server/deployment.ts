import { getVercelOidcToken } from "@vercel/oidc";

// Imported by both Next.js and Eve's Nitro runtime, so this file cannot import `server-only`.

/**
 * Namespace prefix shared by the command relay, scoped MCP credentials, and
 * Eve conversation bindings so older previews never reach a newer deployment's
 * browser tabs or credentials.
 */
export function agentRedisNamespace(env: NodeJS.ProcessEnv = process.env) {
  const namespace = [env.VERCEL_DEPLOYMENT_ID, env.VERCEL_URL, env.GB_AGENT_NAMESPACE]
    .map((value) => value?.trim())
    .find(Boolean);
  return `gb:${namespace ?? "local"}`;
}

/**
 * Base origin for server-to-server calls from Eve back to this deployment.
 * Always comes from deployment configuration, never from an incoming Host or Origin header.
 */
export function agentAppOrigin(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.GB_AGENT_APP_ORIGIN?.trim() ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/**
 * Workload identity headers that pass Vercel Preview Deployment Protection on
 * same-deployment callbacks. This does NOT authorize a user.
 */
export async function agentDeploymentHeaders(): Promise<Record<string, string>> {
  return process.env.VERCEL
    ? { "x-vercel-trusted-oidc-idp-token": await getVercelOidcToken() }
    : {};
}
