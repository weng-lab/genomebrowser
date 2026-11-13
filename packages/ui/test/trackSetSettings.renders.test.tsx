// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  type TrackSettingsProps,
} from "@weng-lab/genomebrowser";
import { TrackSetSettings } from "../src/lib";

function Settings({
  track,
  updateTrack,
  updateTracksOfType,
}: TrackSettingsProps<{ label: string }>) {
  return (
    <>
      <input
        aria-label={`${track.base.id} label`}
        value={track.config.label}
        onChange={(event) => updateTrack({ config: { label: event.target.value } })}
      />
      <button onClick={() => updateTracksOfType(() => ({ config: { label: "Grouped signals" } }))}>
        Apply to signals in set
      </button>
    </>
  );
}
function Signal({ config }: { config: { label: string } }) {
  return <text>{config.label}</text>;
}
const signal = defineTrackModule({
  type: "signal",
  configSchema: z.object({ label: z.string() }),
  fetch: async () => null,
  render: { full: Signal, dense: Signal },
  settingsComponent: Settings,
});
const bed = defineTrackModule({
  type: "interval",
  configSchema: z.object({ label: z.string() }),
  fetch: async () => null,
  render: { full: Signal, pack: Signal, dense: Signal },
  settingsComponent: Settings,
});
let probe: Probe | undefined;
afterEach(() => {
  probe?.unmount();
  probe = undefined;
});
it.each(["mixed", "same"])(
  "configures %s track types through MUI while scoping shared controls to their set",
  async (types) => {
    const useTrackStore = createTrackStore({
      modules: [signal, bed],
      tracks: [
        signal.create({ base: { id: "one", title: "Signal one" }, config: { label: "One" } }),
        signal.create({ base: { id: "two", title: "Signal two" }, config: { label: "Two" } }),
        (types === "mixed" ? bed : signal).create({
          base: { id: "bed", title: "Intervals" },
          config: { label: "Bed" },
        }),
        signal.create({ base: { id: "outside", title: "Outside" }, config: { label: "Outside" } }),
      ],
      trackSets: [{ id: "set", title: "Regulatory data", trackIds: ["one", "two", "bed"] }],
    });
    const useBrowserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 10000 } },
      region: { chromosome: "chr1", start: 0, end: 1000 },
      trackWidth: 800,
    });
    probe = await renderWithProbe(
      <GenomeBrowser
        sizing="fixed"
        browserStore={useBrowserStore}
        trackStore={useTrackStore}
        trackSetSettingsComponent={TrackSetSettings}
      />,
    );
    const opened = await probe.measure(() =>
      document
        .querySelector<SVGGElement>('[aria-label="Settings for track set Regulatory data"]')!
        .dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(opened.pick("TrackSetSettings", "Signal")).toMatchInlineSnapshot(`
    {
      "Signal": 0,
      "TrackSetSettings": 1,
    }
  `);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    const visible = document.querySelector<HTMLInputElement>(
      'input[aria-label="Show Signal two"]',
    )!;
    await probe.measure(() => visible.click());
    expect(document.querySelector('[data-track-id="two"]')).toBeNull();
    const child = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.includes("Signal one"),
    )!;
    await probe.measure(() => child.click());
    const apply = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Apply to signals in set",
    )!;
    await probe.measure(() => apply.click());
    expect(useTrackStore.getState().getTrack("one")!.config).toEqual({ label: "Grouped signals" });
    expect(useTrackStore.getState().getTrack("two")!.config).toEqual({ label: "Grouped signals" });
    expect(useTrackStore.getState().getTrack("outside")!.config).toEqual({ label: "Outside" });
    const select = document.querySelector('[role="combobox"]')!;
    await probe.measure(() => select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(options.some((option) => option.textContent === "Mixed")).toBe(false);
    expect(options.some((option) => option.textContent === "pack")).toBe(false);
    await probe.measure(() => options.find((option) => option.textContent === "dense")!.click());
    expect(useTrackStore.getState().tracks.map((track) => track.base.display)).toEqual([
      "dense",
      "dense",
      "dense",
      "full",
    ]);
    await probe.measure(() =>
      useTrackStore.getState().updateTrack("one", { base: { display: "full" } }),
    );
    await probe.measure(() => select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    const mixedOptions = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
    const mixed = mixedOptions.find((option) => option.textContent === "Mixed");
    expect(mixed?.getAttribute("aria-disabled")).toBe("true");
    await probe.measure(() =>
      mixedOptions.find((option) => option.textContent === "dense")!.click(),
    );
    const ungroup = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Ungroup",
    )!;
    await probe.measure(() => ungroup.click());
    expect(useTrackStore.getState().trackSets).toEqual([]);
    expect(useTrackStore.getState().tracks).toHaveLength(4);
    expect(useTrackStore.getState().hiddenTrackIds).toEqual(["two"]);
  },
);
