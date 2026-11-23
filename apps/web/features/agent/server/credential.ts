import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { sessionIdSchema } from "../../sessions/schema";
import { agentRedisNamespace } from "./deployment";
import { withAgentRedis } from "./redis";

// Imported by both Next.js and Eve's Nitro runtime, so this file cannot import `server-only`.

const credentialTtlSeconds = 300;
const tokenPattern = /^gbmcp_[A-Za-z0-9_-]{43}$/;
const principalSchema = z.object({ userId: z.string().min(1), sessionId: sessionIdSchema });

const credentialKey = (token: string) =>
  `${agentRedisNamespace()}:mcp:${createHash("sha256").update(token).digest("hex")}`;

/**
 * Exchange Eve's verified caller for a short-lived, single-session MCP bearer
 * token. User cookies and Clerk tokens never enter agent history or model context.
 */
export async function issueCommandCredential(userId: string, sessionId: string) {
  const value = principalSchema.parse({ userId, sessionId });
  const token = `gbmcp_${randomBytes(32).toString("base64url")}`;
  await withAgentRedis(async (redis) => {
    await redis.set(credentialKey(token), JSON.stringify(value), { EX: credentialTtlSeconds });
  });
  return { token, expiresAt: Date.now() + credentialTtlSeconds * 1_000 };
}

/** Look up a scoped credential issued in this deployment's namespace, or null when missing/expired. */
export async function readCommandCredential(token: string) {
  if (!tokenPattern.test(token)) return null;
  const raw = await withAgentRedis((redis) => redis.get(credentialKey(token)));
  return raw ? principalSchema.parse(JSON.parse(raw)) : null;
}
