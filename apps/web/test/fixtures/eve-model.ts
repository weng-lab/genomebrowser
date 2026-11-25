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
      // `set_region` is a state tool the server runs; `take_control` is a browser tool the tab runs.
      const takeControl = JSON.stringify(turn[0]).includes("take control");
      const act = navigate || takeControl;
      const results = turn.filter((message) => message.role === "tool");
      const searched = results.some((message) => JSON.stringify(message).includes("eve__search"));
      const called = results.some((message) => JSON.stringify(message).includes("eve__tool"));
      const tool = act && !called;
      // Everything before the latest message: instructions and the context the app adds.
      const context = JSON.stringify(options.prompt.slice(0, user));
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings: [] });
            // Repeat what the model was given, so tests can see the context the app supplies.
            if (prompt.includes("what do you know")) {
              controller.enqueue({ type: "text-start", id: "context" });
              controller.enqueue({ type: "text-delta", id: "context", delta: context });
              controller.enqueue({ type: "text-end", id: "context" });
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "stop", raw: undefined },
                usage: {
                  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
                  outputTokens: { total: 1, text: 1, reasoning: 0 },
                },
              });
              controller.close();
              return;
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
                    ? takeControl
                      ? { name: "genomebrowser__take_control", input: {} }
                      : {
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
                delta: act ? `Browser result: ${prompt}` : "Hello from the genome browser agent.",
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
