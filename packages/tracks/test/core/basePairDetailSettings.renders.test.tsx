// @vitest-environment jsdom
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { afterEach, expect, it } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
} from "@weng-lab/genomebrowser";
import { BasePairDetailSettings } from "../../src/shared/settings/basePairDetailSettings";

function SettingsRenderer() {
  return (
    <foreignObject width={500} height={300}>
      <BasePairDetailSettings />
    </foreignObject>
  );
}
let probe: Probe | undefined;
afterEach(() => probe?.unmount());
it("updates both settings controls without rendering track content for an unchanged gate", async () => {
  const module = defineTrackModule({
    type: "detail-settings",
    configSchema: z.object({}),
    fetch: async () => null,
    render: { full: SettingsRenderer },
  });
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 0, end: 240 },
    trackWidth: 1000,
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: ["a", "b"].map((id) =>
      module.create({ base: { id, title: id, height: 300 }, config: {} }),
    ),
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  // setBasePairDetail changes the displayed cutoff while both cutoffs exclude this
  // viewport. Necessary: each settings control once; no fetching or track content work.
  const report = await probe.measure(() =>
    browserStore.getState().setBasePairDetail({ maxVisibleBases: 200 }),
  );
  expect(report.pick("BasePairDetailSettings", "TrackContent", "GenomeBrowserRuntime"))
    .toMatchInlineSnapshot(`
    {
      "BasePairDetailSettings": 2,
      "GenomeBrowserRuntime": 0,
      "TrackContent": 0,
    }
  `);
});
