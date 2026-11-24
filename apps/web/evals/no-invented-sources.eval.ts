import { defineEval } from "eve/evals";
import { browser, tool } from "./stubs";

export default defineEval({
  description: "Asks for a URL or coordinates instead of inventing them.",
  async test(t) {
    const session = await t.session({ stubs: browser });
    const turn = await session.send("Add an H3K27ac track for liver, then go to the MYC enhancer.");
    turn.expectOk();
    t.notCalledTool(tool("add_tracks_from_urls"));
    t.notCalledTool(tool("set_region"));
    t.messageIncludes(/url|link|coordinates/i);
  },
});
