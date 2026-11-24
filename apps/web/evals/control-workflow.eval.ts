import { defineEval } from "eve/evals";
import { browser, tool } from "./stubs";

const url = "https://users.wenglab.org/niship/hg38_ucsc_std_rmsk.bb";

export default defineEval({
  description: "Holds the browser for a multi-step workflow, in order, and gives it back.",
  async test(t) {
    const session = await t.session({ stubs: browser });
    const turn = await session.send(
      `Take control while you work: add the bigbed track at ${url} titled "RepeatMasker", tag it project=eval, sort the tracks by title, then give control back.`,
    );
    turn.expectOk();
    t.calledTool(tool("add_tracks_from_urls"), { count: 1 });
    // Tagging may ride along with the add, so only the lock and the steps around it are ordered.
    t.toolOrder([
      tool("take_control"),
      tool("add_tracks_from_urls"),
      tool("sort_tracks"),
      tool("release_control"),
    ]);
  },
});
