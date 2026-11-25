import type { ToolStub } from "eve/evals";

// Every browser tool answers from here: evals have no tab, and a call no stub
// matches would run the real tool. Tools come from the `genomebrowser` connection.
export const tool = (name: string) => `genomebrowser__${name}`;

export const tracks = [
  { id: "genes", title: "GENCODE genes", type: "gene", pinned: false, metadata: {} },
  { id: "signal", title: "H3K27ac signal", type: "bigwig", pinned: false, metadata: {} },
];

/** Answers for every browser tool; put rules an eval needs ahead of these. */
export const browser: ToolStub[] = [
  {
    id: "set-region",
    tool: tool("set_region"),
    outcome: {
      response: { region: { chromosome: "chr17", start: 7661778, end: 7687538 }, clamped: false },
    },
  },
  { id: "list-tracks", tool: tool("list_tracks"), outcome: { response: { tracks } } },
  {
    id: "add-tracks",
    tool: tool("add_tracks_from_urls"),
    outcome: { response: { tracks: [{ id: "added", title: "Added track", type: "bigbed" }] } },
  },
  {
    id: "set-metadata",
    tool: tool("set_track_metadata"),
    outcome: { response: { tracks: [{ id: "added", metadata: { project: "eval" } }] } },
  },
  {
    id: "sort-tracks",
    tool: tool("sort_tracks"),
    outcome: { response: { tracks: tracks.map(({ id, title }) => ({ id, title })) } },
  },
  {
    id: "export-image",
    tool: tool("export_image"),
    outcome: { response: { filename: "view.png", format: "png", width: 2000, height: 800 } },
  },
  { id: "take-control", tool: tool("take_control"), outcome: { response: { held: true } } },
  { id: "release-control", tool: tool("release_control"), outcome: { response: { held: false } } },
];
