// @vitest-environment jsdom
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { afterEach, expect, it } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  useBasePairDetail,
} from "../../src/lib";

function DetailConsumer() {
  const detail = useBasePairDetail();
  return <text>{detail ? "bases" : "signal"}</text>;
}
function UnrelatedConsumer() {
  return <text>unrelated</text>;
}
let probe: Probe | undefined;
afterEach(() => probe?.unmount());
it("budgets central setting and width changes", async () => {
  const detailModule = defineTrackModule({
    type: "detail",
    configSchema: z.object({}),
    fetch: async () => null,
    render: { full: DetailConsumer },
  });
  const unrelatedModule = defineTrackModule({
    type: "unrelated",
    configSchema: z.object({}),
    fetch: async () => null,
    render: { full: UnrelatedConsumer },
  });
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 0, end: 100 },
    trackWidth: 1000,
  });
  const trackStore = createTrackStore({
    modules: [detailModule, unrelatedModule],
    tracks: [
      ...["a", "b"].map((id) => detailModule.create({ base: { id, title: id }, config: {} })),
      unrelatedModule.create({ base: { id: "c", title: "c" }, config: {} }),
    ],
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  // setBasePairDetail changes the shared decision without changing geometry. All
  // fetchers receive new eligibility. Each DetailConsumer renders once for the
  // gate and once for its result; other content renders once for its result.
  // Geometry components do no work.
  const changed = await probe.measure(() =>
    browserStore.getState().setBasePairDetail({ maxVisibleBases: 99 }),
  );
  expect(
    changed.pick(
      "GenomeBrowserRuntime",
      "BrowserView",
      "TrackContent",
      "DetailConsumer",
      "UnrelatedConsumer",
    ),
  ).toMatchInlineSnapshot(`
    {
      "BrowserView": 0,
      "DetailConsumer": 4,
      "GenomeBrowserRuntime": 0,
      "TrackContent": 3,
      "UnrelatedConsumer": 1,
    }
  `);
  // A cutoff edit which leaves eligibility unchanged must do no rendering work.
  const unchanged = await probe.measure(() =>
    browserStore.getState().setBasePairDetail({ maxVisibleBases: 98 }),
  );
  expect(
    unchanged.pick(
      "GenomeBrowserRuntime",
      "BrowserView",
      "TrackContent",
      "DetailConsumer",
      "UnrelatedConsumer",
    ),
  ).toMatchInlineSnapshot(`
    {
      "BrowserView": 0,
      "DetailConsumer": 0,
      "GenomeBrowserRuntime": 0,
      "TrackContent": 0,
      "UnrelatedConsumer": 0,
    }
  `);
  await probe.measure(() => browserStore.getState().setBasePairDetail({ maxVisibleBases: 100 }));
  // setTrackWidth crosses the exit guard. Content first receives its new width,
  // then hook consumers receive the measured-width decision before paint.
  const resized = await probe.measure(() => browserStore.getState().setTrackWidth(599));
  expect(
    resized.pick(
      "GenomeBrowserRuntime",
      "BrowserView",
      "TrackContent",
      "DetailConsumer",
      "UnrelatedConsumer",
    ),
  ).toMatchInlineSnapshot(`
    {
      "BrowserView": 1,
      "DetailConsumer": 4,
      "GenomeBrowserRuntime": 1,
      "TrackContent": 3,
      "UnrelatedConsumer": 1,
    }
  `);
});
