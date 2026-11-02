import { defineAgent } from "eve";

// Deterministic model boundary; Eve, its tools, the command relay, and the tab are real.
export default defineAgent({
  defaultTools: false,
  modelContextWindowTokens: 200_000,
  model: {
    specificationVersion: "v3",
    provider: "test",
    modelId: "scripted-browser",
    supportedUrls: {},
    async doGenerate() {
      throw new Error("Only streaming is expected");
    },
    async doStream(options: {
      abortSignal?: AbortSignal;
      prompt: { role: string; content: unknown }[];
    }) {
      const user = options.prompt.findLastIndex((message) => message.role === "user");
      const turn = options.prompt.slice(user);
      const prompt = JSON.stringify(turn);
      const navigate = prompt.includes("navigate");
      const called = turn.some(
        (message) => message.role === "tool" && JSON.stringify(message).includes("set_region"),
      );
      const tool = navigate && !called;
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings: [] });
            if (prompt.includes("wait for stop")) {
              controller.enqueue({ type: "text-start", id: "waiting" });
              controller.enqueue({ type: "text-delta", id: "waiting", delta: "Waiting for Stop." });
              options.abortSignal?.addEventListener(
                "abort",
                () => controller.error(new Error("Cancelled")),
                { once: true },
              );
              return;
            }
            if (tool) {
              controller.enqueue({
                type: "tool-call",
                toolCallId: crypto.randomUUID(),
                toolName: "set_region",
                input: JSON.stringify({ region: { chromosome: "chr1", start: 1000, end: 2000 } }),
              });
            } else {
              controller.enqueue({ type: "text-start", id: "answer" });
              controller.enqueue({
                type: "text-delta",
                id: "answer",
                delta: navigate
                  ? `Browser result: ${prompt}`
                  : "Hello from the genome browser agent.",
              });
              controller.enqueue({ type: "text-end", id: "answer" });
            }
            controller.enqueue({
              type: "finish",
              finishReason: { unified: tool ? "tool-calls" : "stop", raw: undefined },
              usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
            });
            controller.close();
          },
        }),
      };
    },
  },
});
