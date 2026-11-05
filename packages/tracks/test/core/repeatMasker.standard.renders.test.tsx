// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createBrowserStore, createTrackStore, GenomeBrowser } from "@weng-lab/genomebrowser";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { repeatMaskerModule as module } from "@weng-lab/genomebrowser-tracks/repeatmasker";
import { sources } from "../fixtures/repeatMasker";
import { standardRepeatFile, serveRepeats } from "../fixtures/repeatMaskerStandard";

let probe: Probe | undefined;
afterEach(() => {
  probe?.unmount();
  vi.unstubAllGlobals();
});

it("budgets presentation changes and label-only updates without re-reading the file and preserves typed click targets", async () => {
  const fetch = serveRepeats(standardRepeatFile);
  const onClick = vi.fn();
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 248956422 } },
    region: { chromosome: "chr1", start: 0, end: 3000 },
    trackWidth: 1000,
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: [
      module.create(
        {
          base: { id: "repeats", title: "RepeatMasker", display: "pack" },
          config: {
            sources: {
              ...sources,
              standard: "https://users.wenglab.org/niship/hg38_ucsc_std_rmsk.bb",
            },
            view: "standard",
          },
        },
        { onClick },
      ),
    ],
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  expect(document.querySelectorAll("[data-repeatmasker-block]")).toHaveLength(11);
  expect(document.querySelector("[data-repeatmasker-label]")?.textContent).toBe("repeat0");
  const requestCount = fetch.mock.calls.length;
  // updateTrack changes label visibility. Both components must render the new config once;
  // the unchanged row count needs no height update or second render.
  const labels = await probe.measure(() =>
    trackStore.getState().updateTrack("repeats", { config: { showLabels: false } }),
  );
  expect(labels.pick("PackedStandardRepeatMasker", "RepeatRows")).toMatchInlineSnapshot(`
    {
      "PackedStandardRepeatMasker": 1,
      "RepeatRows": 1,
    }
  `);
  expect(document.querySelector("[data-repeatmasker-label]")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(requestCount);
  // Switching to class bands mounts the full renderer, then the shared row-layout
  // effect commits the taller track height. Both renders show changed layout.
  const display = await probe.measure(() =>
    trackStore.getState().updateTrack("repeats", { base: { display: "full" } }),
  );
  // Each fixed class label mounts once. The height commit is handled by the
  // overlay context, without rendering unchanged label components again.
  expect(display.pick("RepeatClassLabel", "TrackLabel")).toMatchInlineSnapshot(`
    {
      "RepeatClassLabel": 10,
      "TrackLabel": 10,
    }
  `);
  expect(display.pick("FullStandardRepeatMasker", "RepeatRows")).toMatchInlineSnapshot(`
    {
      "FullStandardRepeatMasker": 2,
      "RepeatRows": 2,
    }
  `);
  expect(document.querySelectorAll("[data-repeatmasker-category]")).toHaveLength(10);
  const hoverRequestCount = fetch.mock.calls.length;
  const classLabel = document.querySelector(
    '[data-repeatmasker-class-label="SINE"] [data-repeatmasker-label-hitbox]',
  )!;
  // Hovering a class label is a visual affordance, with no React state or data changes.
  const hover = await probe.measure(() => {
    classLabel.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  expect(
    hover.pick(
      "FullStandardRepeatMasker",
      "RepeatClassLabel",
      "RepeatRows",
      "RepeatGlyph",
      "TrackLabel",
    ),
  ).toMatchInlineSnapshot(`
    {
      "FullStandardRepeatMasker": 0,
      "RepeatClassLabel": 0,
      "RepeatGlyph": 0,
      "RepeatRows": 0,
      "TrackLabel": 0,
    }
  `);
  const leave = await probe.measure(() => {
    classLabel.dispatchEvent(
      new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }),
    );
  });
  expect(
    leave.pick(
      "FullStandardRepeatMasker",
      "RepeatClassLabel",
      "RepeatRows",
      "RepeatGlyph",
      "TrackLabel",
    ),
  ).toMatchInlineSnapshot(`
    {
      "FullStandardRepeatMasker": 0,
      "RepeatClassLabel": 0,
      "RepeatGlyph": 0,
      "RepeatRows": 0,
      "TrackLabel": 0,
    }
  `);
  expect(fetch).toHaveBeenCalledTimes(hoverRequestCount);
  const panRequestCount = fetch.mock.calls.length;
  // A pan within the cached overscan updates positions without another file read.
  const pan = await probe.measure(() =>
    browserStore.getState().setRegion({ chromosome: "chr1", start: 100, end: 3100 }),
  );
  // The genomic glyph positions change, while the stationary labels retain
  // the same category, vertical position, and highlight configuration.
  expect(pan.pick("RepeatClassLabel", "TrackLabel")).toMatchInlineSnapshot(`
    {
      "RepeatClassLabel": 0,
      "TrackLabel": 0,
    }
  `);
  expect(pan.pick("FullStandardRepeatMasker", "RepeatRows")).toMatchInlineSnapshot(`
    {
      "FullStandardRepeatMasker": 1,
      "RepeatRows": 1,
    }
  `);
  expect(fetch).toHaveBeenCalledTimes(panRequestCount);
  await probe.measure(() => {
    document
      .querySelector("[data-repeatmasker-repeat]")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onClick).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "repeat0",
      repClass: "SINE",
      swScore: 2500,
    }),
    expect.objectContaining({
      type: "repeatmasker",
      base: expect.objectContaining({ display: "full" }),
    }),
  );
});
