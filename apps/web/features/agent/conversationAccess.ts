import { createClient } from "redis";

// Access metadata only: chat history and execution remain in Eve/Workflow.
// Ephemeral panel conversations must be restarted after this grant expires.
const lifetimeSeconds = 86_400;
const bind = `redis.call("SET", KEYS[1], ARGV[1], "NX", "EX", ARGV[2])
if redis.call("GET", KEYS[1]) == ARGV[1] then return 1 end
return 0`;

async function access(conversationId: string, principalId: string, create: boolean) {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required for agent conversation access");
  const client = createClient({
    url,
    disableOfflineQueue: true,
    socket: { connectTimeout: 5_000, socketTimeout: 5_000, reconnectStrategy: false },
  });
  client.on("error", (error: unknown) => console.error("Agent access Redis error", error));
  try {
    await client.connect();
    const redis = client.withCommandOptions({ timeout: 5_000 });
    const key = `gb:agent-access:${conversationId}`;
    return create
      ? (await redis.eval(bind, {
          keys: [key],
          arguments: [principalId, String(lifetimeSeconds)],
        })) === 1
      : (await redis.get(key)) === principalId;
  } finally {
    if (client.isOpen) client.destroy();
  }
}

/** Pin a newly created conversation to its verified user and browser session. */
export async function bindConversation(conversationId: string, principalId: string) {
  if (!(await access(conversationId, principalId, true)))
    throw new Error("Conversation already belongs to another caller");
}

/** Missing or expired bindings deny access, including after Redis loses its data. */
export function canAccessConversation(conversationId: string, principalId: string) {
  return access(conversationId, principalId, false);
}
