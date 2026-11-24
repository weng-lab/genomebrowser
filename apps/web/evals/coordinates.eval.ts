import { defineEval } from "eve/evals";
import { browser, tool } from "./stubs";

export default defineEval({
  description: "Converts 1-based display coordinates to the tool's 0-based, half-open region.",
  async test(t) {
    const session = await t.session({ stubs: browser });
    const turn = await session.send("Go to chr17:7,661,779-7,687,538.");
    turn.expectOk();
    turn.calledTool(tool("set_region"), {
      input: { region: { chromosome: "chr17", start: 7661778, end: 7687538 } },
      count: 1,
    });
    // One action never takes the browser from the user.
    t.notCalledTool(tool("take_control"));
  },
});
