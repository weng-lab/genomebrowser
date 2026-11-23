import { agentRedisNamespace } from "./deployment";
import { withAgentRedis } from "./redis";

// Imported by both Next.js and Eve's Nitro runtime, so this file cannot import `server-only`.

/** Redis key naming the tab connection that receives a session's commands. The relay owns it. */
export function tabLeaseKey(namespace: string, sessionId: string) {
  return `${namespace}:lease:${sessionId}`;
}

/**
 * Whether a browser tab holds `sessionId`'s commands, waiting up to `graceMs`
 * for one to attach, as a reloading tab does. Resolves false when `signal`
 * aborts first.
 */
export async function waitForTab(sessionId: string, graceMs: number, signal: AbortSignal) {
  const key = tabLeaseKey(agentRedisNamespace(), sessionId);
  const deadline = Date.now() + graceMs;
  for (;;) {
    if ((await withAgentRedis((redis) => redis.exists(key))) > 0) return true;
    const wait = Math.min(500, deadline - Date.now());
    if (wait <= 0 || signal.aborted) return false;
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", done);
        resolve();
      };
      const timer = setTimeout(done, wait);
      signal.addEventListener("abort", done, { once: true });
    });
  }
}
