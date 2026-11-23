import { agentRedisNamespace } from "./deployment";
import { withAgentRedis } from "./redis";

// Imported by both Next.js and Eve's Nitro runtime, so this file cannot import `server-only`.

/** Redis key naming the tab connection that receives a session's commands. The relay owns it. */
export function tabLeaseKey(namespace: string, sessionId: string) {
  return `${namespace}:lease:${sessionId}`;
}

const pollMs = 1_000;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });
}

/**
 * Whether a browser tab holds `sessionId`'s commands, waiting up to `graceMs`
 * for one to attach, as a reloading tab does: `"attached"` or `"absent"`.
 * `"unknown"` when `signal` aborts first or Redis cannot answer.
 */
export async function tabPresence(
  sessionId: string,
  graceMs: number,
  signal: AbortSignal,
): Promise<"attached" | "absent" | "unknown"> {
  if (signal.aborted) return "unknown";
  const key = tabLeaseKey(agentRedisNamespace(), sessionId);
  const deadline = Date.now() + graceMs;
  try {
    return await withAgentRedis(
      async (redis) => {
        for (;;) {
          if ((await redis.exists(key)) > 0) return "attached";
          const wait = Math.min(pollMs, deadline - Date.now());
          if (wait <= 0) return "absent";
          await sleep(wait, signal);
          if (signal.aborted) return "unknown";
        }
      },
      { timeoutMs: graceMs + 5_000 },
    );
  } catch (error) {
    console.error("Could not check whether the session's tab is open", error);
    return "unknown";
  }
}
