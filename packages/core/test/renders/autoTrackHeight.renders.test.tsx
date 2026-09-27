// @vitest-environment jsdom

import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { afterEach, expect, it } from "vitest";
import { z } from "zod";
import { GenomeBrowser } from "../../src/browser/GenomeBrowser";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { useAutoTrackHeight } from "../../src/browser/track-row/layout/useAutoTrackHeight";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import type { TrackRendererProps } from "../../src/modules/types";

function AutoHeightRenderer({
  id,
  visibleRegion,
}: TrackRendererProps<Record<string, never>, null>) {
  const rowCount = visibleRegion.start === 0 ? 4 : 8;
  useAutoTrackHeight(id, rowCount);
  return <text>{rowCount} rows</text>;
}

const module = defineTrackModule({
  type: "auto-height-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: AutoHeightRenderer },
});

let probe: Probe | undefined;
afterEach(() => {
  probe?.unmount();
  probe = undefined;
});

it("shares automatic height without competing when browser row counts differ", async () => {
  const createView = () =>
    createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 10000 } },
      region: { chromosome: "chr1", start: 0, end: 1000 },
      trackWidth: 1000,
    });
  const first = createView();
  const second = createView();
  const trackStore = createTrackStore({
    modules: [module],
    tracks: [module.create({ base: { id: "rows", title: "Rows", height: 48 }, config: {} })],
  });
  probe = await renderWithProbe(
    <>
      <GenomeBrowser sizing="fixed" browserStore={first} trackStore={trackStore} />
      <GenomeBrowser sizing="fixed" browserStore={second} trackStore={trackStore} />
    </>,
  );

  // Changing one browser's region changes its row count. Both views receive
  // the resulting shared height, but only the changed sizing inputs request it.
  const report = await probe.measure(() =>
    second.getState().setRegion({
      chromosome: "chr1",
      start: 2000,
      end: 3000,
    }),
  );
  expect(trackStore.getState().getTrack("rows")?.base.height).toBe(96);
  expect([...document.querySelectorAll("text")].map((node) => node.textContent)).toEqual(
    expect.arrayContaining(["4 rows", "8 rows"]),
  );
  // Necessary: the changed region and loaded data render in the second view,
  // and both renderers receive the shared height change.
  expect(report.pick("AutoHeightRenderer")).toMatchInlineSnapshot(`
    {
      "AutoHeightRenderer": 4,
    }
  `);

  // A host height update remains in effect until a renderer's sizing inputs change.
  await probe.measure(() => trackStore.getState().updateTrack("rows", { base: { height: 72 } }));
  expect(trackStore.getState().getTrack("rows")?.base.height).toBe(72);
  await probe.measure(() =>
    second.getState().setRegion({ chromosome: "chr1", start: 0, end: 1000 }),
  );
  expect(trackStore.getState().getTrack("rows")?.base.height).toBe(48);
});
