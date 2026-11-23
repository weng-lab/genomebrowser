import { defineAgent } from "eve";

// Deterministic model boundary; Eve, its MCP connection, the command relay, and the tab are real.
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
      const results = turn.filter((message) => message.role === "tool");
      const searched = results.some((message) => JSON.stringify(message).includes("eve__search"));
      const called = results.some((message) => JSON.stringify(message).includes("eve__tool"));
      const tool = navigate && !called;
      const summarizing = prompt.includes("This conversation is ending");
      const replied = results.some((message) => JSON.stringify(message).includes("eve__reply"));
      const system = options.prompt
        .filter((message) => message.role === "system")
        .map((message) => (typeof message.content === "string" ? message.content : ""))
        .join("\n");
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings: [] });
            const finish = (reason: "stop" | "tool-calls") => {
              controller.enqueue({
                type: "finish",
                finishReason: { unified: reason, raw: undefined },
                usage: {
                  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
                  outputTokens: { total: 1, text: 1, reasoning: 0 },
                },
              });
              controller.close();
            };
            // The structured summary a thread writes before it rolls over.
            if (summarizing && !replied) {
              controller.enqueue({
                type: "tool-call",
                toolCallId: crypto.randomUUID(),
                toolName: "eve__reply",
                input: JSON.stringify({
                  sessionHistory: "Nothing before this conversation.",
                  latestThread: "The user greeted the agent.",
                }),
              });
              return finish("tool-calls");
            }
            if (summarizing) return finish("stop");
            // Repeat the system instructions, so tests can see the context the app supplies.
            if (prompt.includes("what do you know")) {
              controller.enqueue({ type: "text-start", id: "context" });
              controller.enqueue({ type: "text-delta", id: "context", delta: system });
              controller.enqueue({ type: "text-end", id: "context" });
              return finish("stop");
            }
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
                toolName: searched ? "eve__tool" : "eve__search",
                input: JSON.stringify(
                  searched
                    ? {
                        name: "genomebrowser__set_region",
                        input: { region: { chromosome: "chr1", start: 1000, end: 2000 } },
                      }
                    : { query: "genomebrowser__" },
                ),
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
              usage: {
                inputTokens: {
                  total: 1,
                  noCache: 1,
                  cacheRead: 0,
                  cacheWrite: 0,
                },
                outputTokens: {
                  total: 1,
                  text: 1,
                  reasoning: 0,
                },
              },
            });
            controller.close();
          },
        }),
      };
    },
  },
});
