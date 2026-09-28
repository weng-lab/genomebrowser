// @vitest-environment jsdom
import { renderWithProbe } from "@weng-lab/render-probe";
import { expect, it } from "vitest";
import { z } from "zod";
import {
  createBrowserStore,
  createCompositeModule,
  createTrackStore,
  defineTrackModule,
  GenomeBrowser,
} from "../../src/lib";
function ChildA({ color }: { color: string }) {
  return <rect fill={color} />;
}
function ChildB({ color }: { color: string }) {
  return <rect fill={color} />;
}
function Standalone({ color }: { color: string }) {
  return <rect fill={color} />;
}
it("isolates a child edit and composite layout change", async () => {
  const a = defineTrackModule({
    type: "a",
    configSchema: z.object({}),
    fetch: async () => null,
    render: { full: ChildA },
  });
  const b = defineTrackModule({
    type: "b",
    configSchema: z.object({}),
    fetch: async () => null,
    render: { full: ChildB },
  });
  const c = defineTrackModule({
    type: "c",
    configSchema: z.object({}),
    fetch: async () => null,
    render: { full: Standalone },
  });
  const composite = createCompositeModule();
  const store = createTrackStore({
    modules: [a, b, c, composite],
    tracks: [
      composite.create({
        base: { id: "group", title: "Group" },
        tracks: [
          a.create({ base: { id: "a", title: "A" }, config: {} }),
          b.create({ base: { id: "b", title: "B" }, config: {} }),
        ],
      }),
      c.create({ base: { id: "c", title: "C" }, config: {} }),
    ],
  });
  const browser = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    marginWidth: 100,
    trackWidth: 1000,
  });
  const probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browser} trackStore={store} />,
  );
  try {
    // Only A displays a changed color. B and the standalone renderer need no work.
    const edit = await probe.measure(() => {
      store.getState().updateTrack("a", { base: { color: "#123456" } });
    });
    expect(edit.pick("ChildA", "ChildB", "Standalone", "TrackPlot", "TrackContent", "TrackRow"))
      .toMatchInlineSnapshot(`
      {
        "ChildA": 1,
        "ChildB": 0,
        "Standalone": 0,
        "TrackContent": 1,
        "TrackPlot": 1,
        "TrackRow": 1,
      }
    `);
    // Both children receive overlay dimensions. The standalone renderer stays unchanged.
    const layout = await probe.measure(() => {
      store.getState().updateTrack("group", { base: { display: "overlay" } });
    });
    expect(layout.pick("ChildA", "ChildB", "Standalone", "TrackPlot", "TrackContent", "TrackRow"))
      .toMatchInlineSnapshot(`
      {
        "ChildA": 1,
        "ChildB": 1,
        "Standalone": 0,
        "TrackContent": 2,
        "TrackPlot": 2,
        "TrackRow": 2,
      }
    `);
  } finally {
    probe.unmount();
  }
});
