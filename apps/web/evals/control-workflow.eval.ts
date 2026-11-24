import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";
import { calls } from "eve/events";
import { browser, tool } from "./stubs";

const url = "https://users.wenglab.org/niship/hg38_ucsc_std_rmsk.bb";

type AddInput = { tracks?: { url?: string; title?: string; metadata?: Record<string, unknown> }[] };
type TagInput = { trackIds?: string[]; set?: Record<string, unknown> };
type SortInput = { by?: { field?: string }[] };

/** Whether the tool calls tag the added track project=eval, with the add or in a call of its own. */
function tagsTheTrack(made: readonly { name: string; input?: unknown }[]) {
  return made.some(({ name, input }) => {
    if (name === tool("add_tracks_from_urls"))
      return (input as AddInput).tracks?.[0]?.metadata?.project === "eval";
    if (name !== tool("set_track_metadata")) return false;
    const { trackIds, set } = input as TagInput;
    return trackIds?.includes("added") === true && set?.project === "eval";
  });
}

export default defineEval({
  description:
    "Decides to hold the browser for a multi-step workflow, does each step as asked, and gives it back at the end.",
  async test(t) {
    const session = await t.session({ stubs: browser });
    const turn = await session.send(
      `Add the bigbed track at ${url} titled "RepeatMasker", tag it project=eval, then sort the tracks by title.`,
    );
    t.succeeded();
    t.calledTool(tool("add_tracks_from_urls"), {
      input: (input: unknown) => {
        const { tracks } = input as AddInput;
        return tracks?.length === 1 && tracks[0].url === url && tracks[0].title === "RepeatMasker";
      },
      count: 1,
    });
    t.calledTool(tool("sort_tracks"), {
      input: (input: unknown) => {
        const { by } = input as SortInput;
        return by?.length === 1 && by[0].field === "title";
      },
      count: 1,
    });
    t.check(
      calls(turn.view, { kind: "tool" }),
      satisfies(tagsTheTrack, "tags the added track project=eval"),
    );
    // Tagging may ride along with the add, so only the lock and the steps around it are ordered.
    t.toolOrder([
      tool("take_control"),
      tool("add_tracks_from_urls"),
      tool("sort_tracks"),
      tool("release_control"),
    ]);
  },
});
