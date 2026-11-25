import { agentRedisNamespace } from "./deployment";
import { withAgentRedis } from "./redis";

// Imported by Eve's Nitro runtime, so this file cannot import `server-only`.
// Access metadata only: ephemeral chat history and runs live in Eve.

const bindingTtlSeconds = 86_400;
const bindScript = `redis.call("SET", KEYS[1], ARGV[1], "NX", "EX", ARGV[2])
if redis.call("GET", KEYS[1]) == ARGV[1] then return 1 end
return 0`;

async function access(conversationId: string, principalId: string, create: boolean) {
  return withAgentRedis(async (redis) => {
    const key = `${agentRedisNamespace()}:agent-access:${conversationId}`;
    return create
      ? (await redis.eval(bindScript, {
          keys: [key],
          arguments: [principalId, String(bindingTtlSeconds)],
        })) === 1
      : (await redis.get(key)) === principalId;
  });
}

/** Pin a newly created Eve conversation to its verified user and browser session. */
export async function bindConversation(conversationId: string, principalId: string) {
  if (!(await access(conversationId, principalId, true)))
    throw new Error("Conversation already belongs to another caller");
}

/** Whether `principalId` owns `conversationId`. Missing or expired bindings deny access. */
export function canAccessConversation(conversationId: string, principalId: string) {
  return access(conversationId, principalId, false);
}
