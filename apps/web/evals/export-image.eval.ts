import { defineEval } from "eve/evals";
import { browser, tool } from "./stubs";

export default defineEval({
  description: "Exports with the requested options and never claims to see the image.",
  async test(t) {
    const session = await t.session({ stubs: browser });
    const turn = await session.send(
      "Export the current view as a PNG at 2x scale named tp53.png, with track titles.",
    );
    turn.expectOk();
    turn.calledTool(tool("export_image"), {
      input: { format: "png", scale: 2, includeTitles: true, filename: /tp53/ },
      count: 1,
    });
    t.notCalledTool(tool("take_control"));
  },
});
