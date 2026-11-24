import { defineEval } from "eve/evals";
import { browser, tool } from "./stubs";

const url = "https://users.wenglab.org/niship/hg38_ucsc_std_rmsk.bb";

export default defineEval({
  description:
    "Decides to hold the browser for a multi-step workflow, and gives it back at the end.",
  async test(t) {
    const session = await t.session({ stubs: browser });
    await session.send(
      `Add the bigbed track at ${url} titled "RepeatMasker", tag it project=eval, then sort the tracks by title.`,
    );
    t.succeeded();
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
