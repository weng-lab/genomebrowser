import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { sessionIdSchema } from "../../sessions/schema";
import { agentRedisPrefix, withAgentRedis } from "./redis";

const principal = z.object({ userId: z.string().min(1), sessionId: sessionIdSchema });
const key = (token: string) =>
  `${agentRedisPrefix()}mcp:${createHash("sha256").update(token).digest("hex")}`;

/** Eve exchanges its verified caller for a short, single-session MCP credential.
 * User cookies/tokens never enter agent history or the model context. */
export async function issueCommandCredential(userId: string, sessionId: string) {
  const value = principal.parse({ userId, sessionId });
  const token = `gbmcp_${randomBytes(32).toString("base64url")}`;
  await withAgentRedis(async (redis) => {
    await redis.set(key(token), JSON.stringify(value), { EX: 300 });
  });
  return { token, expiresAt: Date.now() + 300_000 };
}

/** Issued by trusted application code, scoped to this deployment and one saved session. */
export async function readCommandCredential(token: string) {
  if (!/^gbmcp_[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const value = await withAgentRedis((redis) => redis.get(key(token)));
  return value ? principal.parse(JSON.parse(value)) : null;
}
