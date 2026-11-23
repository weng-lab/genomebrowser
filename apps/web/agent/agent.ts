import { defineAgent } from "eve";
import { defineDynamic } from "eve/models";
import { anthropic } from "eve/models/anthropic";
import { chatgpt, openai } from "eve/models/openai";

export default defineAgent({
  model: defineDynamic(() => {
    if (
      process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL ||
      process.env.NODE_ENV === "production"
    ) {
      return "openai/gpt-6-luna";
    }
    if (process.env.OPENAI_API_KEY?.trim()) return openai("gpt-6-luna-fast");
    if (process.env.ANTHROPIC_API_KEY?.trim()) return anthropic();
    return {
      model: chatgpt("gpt-6-luna-fast"),
      // Codex's local context budget; this provider ID is absent from Gateway's catalog.
      modelContextWindowTokens: 272_000,
    };
  }),
  defaultTools: false,
  // One thread per saved session that never rolls over: Eve compacts it as it
  // grows, and it lives until New conversation or deleting the session ends it.
  // Private sessions keep no messages once they end, so they never time out.
  compaction: { threshold: 0.75 },
  limits: { sessionTimeoutMs: false },
});
