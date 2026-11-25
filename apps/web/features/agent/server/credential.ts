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

const bindSchema = principalSchema.extend({ conversationId: z.string().min(1) });
const bindKey = (token: string) =>
  `${agentRedisNamespace()}:bind:${createHash("sha256").update(token).digest("hex")}`;

/**
 * Prove, for one minute and one use, that Eve created `conversationId` for this
 * user and browser session, so the app records it as the session's thread.
 * Browser callers cannot mint one, so they cannot claim another conversation.
 */
export async function issueBindProof(userId: string, sessionId: string, conversationId: string) {
  const value = bindSchema.parse({ userId, sessionId, conversationId });
  const token = `gbbind_${randomBytes(32).toString("base64url")}`;
  await withAgentRedis(async (redis) => {
    await redis.set(bindKey(token), JSON.stringify(value), { EX: 60 });
  });
  return token;
}

/** Use up a bind proof, returning what it proves, or null when it is missing, expired, or used. */
export async function consumeBindProof(token: string) {
  if (!/^gbbind_[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const raw = await withAgentRedis((redis) => redis.getDel(bindKey(token)));
  return raw ? bindSchema.parse(JSON.parse(raw)) : null;
}
