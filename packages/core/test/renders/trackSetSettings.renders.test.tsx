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
} from "../../src/lib";
import { ThemeProvider, createTheme } from "@mui/material/styles";

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
      <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
    );
    expect(
      document.querySelector('[aria-label="Settings for track set Regulatory data"]'),
    ).not.toBeNull();
    const opened = await probe.measure(() =>
      document
        .querySelector<SVGGElement>('[aria-label="Settings for track set Regulatory data"]')!
        .dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(opened.pick("DefaultTrackSetSettings", "Signal")).toMatchInlineSnapshot(`
    {
      "DefaultTrackSetSettings": 1,
      "Signal": 0,
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
      (button) => button.textContent === "Remove track set",
    )!;
    await probe.measure(() => ungroup.click());
    expect(useTrackStore.getState().trackSets).toEqual([]);
    expect(useTrackStore.getState().tracks).toHaveLength(4);
    expect(useTrackStore.getState().hiddenTrackIds).toEqual(["two"]);
  },
);

function groupStores() {
  return {
    browserStore: createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 10000 } },
      region: { chromosome: "chr1", start: 0, end: 1000 },
      trackWidth: 800,
    }),
    trackStore: createTrackStore({
      modules: [signal],
      tracks: [
        signal.create({
          base: { id: "one", title: "Signal one", color: "#00b3cc" },
          config: { label: "One" },
        }),
      ],
      trackSets: [{ id: "set", title: "Signals", trackIds: ["one"] }],
    }),
  };
}

it("inherits the host theme for group chrome and the default dialog without changing scientific colors", async () => {
  const stores = groupStores();
  const light = createTheme({
    palette: {
      mode: "light",
      background: { paper: "#fafafa" },
      divider: "#526374",
      text: { primary: "#123456" },
    },
    typography: { fontFamily: "Georgia" },
  });
  const dark = createTheme({
    palette: {
      mode: "dark",
      background: { paper: "#101820" },
      divider: "#789abc",
      text: { primary: "#e0e8f0" },
    },
    typography: { fontFamily: "Georgia" },
  });
  const tree = (theme: typeof light) => (
    <ThemeProvider theme={theme}>
      <GenomeBrowser sizing="fixed" {...stores} />
    </ThemeProvider>
  );
  probe = await renderWithProbe(tree(light));
  const header = () => document.querySelector<SVGGElement>('[data-track-set-id="set"]')!;
  const outline = () => document.querySelector('[data-track-set-outline="set"]')!;
  expect(header().querySelector("rect")!.getAttribute("fill")).toBe("#fafafa");
  expect(outline().getAttribute("stroke")).toBe("#526374");
  expect(header().style.color).toBe("rgb(18, 52, 86)");
  expect(header().style.fontFamily).toBe("Georgia");
  await probe.measure(() => probe!.rerender(tree(dark)));
  expect(header().querySelector("rect")!.getAttribute("fill")).toBe("#101820");
  expect(outline().getAttribute("stroke")).toBe("#789abc");
  expect(header().style.color).toBe("rgb(224, 232, 240)");
  expect(stores.trackStore.getState().getTrack("one")!.base.color).toBe("#00b3cc");
  await probe.measure(() =>
    document
      .querySelector('[aria-label="Settings for track set Signals"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(getComputedStyle(document.querySelector("dialog")!).backgroundColor).toBe(
    "rgb(16, 24, 32)",
  );
});

it("uses the host palette for a track-set drag preview and cancels it without changing membership", async () => {
  const stores = groupStores();
  const theme = createTheme({
    palette: { mode: "dark", primary: { main: "#b744aa" }, background: { paper: "#101820" } },
  });
  probe = await renderWithProbe(
    <ThemeProvider theme={theme}>
      <GenomeBrowser sizing="fixed" {...stores} />
    </ThemeProvider>,
  );
  const svg = document.querySelector<SVGSVGElement>('svg[aria-label="Genome browser"]')!;
  const point = {
    x: 0,
    y: 0,
    matrixTransform() {
      return { x: this.x, y: this.y };
    },
  };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
  const pointer = (type: string, y: number, target: EventTarget) => {
    const event = new MouseEvent(type, {
      clientX: 20,
      clientY: y,
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
    target.dispatchEvent(event);
  };
  await probe.measure(() =>
    pointer("pointerdown", 10, document.querySelector('[data-track-set-drag-handle="set"]')!),
  );
  const bottom = Number(svg.getAttribute("viewBox")!.split(" ")[3]) + 10;
  await probe.measure(() => pointer("pointermove", bottom, document));
  const preview = document.querySelector("[data-track-drop-preview]")!;
  expect(preview).not.toBeNull();
  expect(preview.querySelector("line")!.getAttribute("stroke")).toBe("#b744aa");
  expect(preview.querySelector("rect")!.getAttribute("fill")).toBe("#101820");
  await probe.measure(() =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  expect(document.querySelector("[data-track-drop-preview]")).toBeNull();
  expect(stores.trackStore.getState().trackSets[0].trackIds).toEqual(["one"]);
});

it("drags track-set settings, preserves child state, and returns focus when closed", async () => {
  const stores = groupStores();
  probe = await renderWithProbe(<GenomeBrowser sizing="fixed" {...stores} />);
  const opener = document.querySelector<SVGGElement>(
    '[aria-label="Settings for track set Signals"]',
  )!;
  await probe.measure(() => {
    opener.focus();
    opener.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog).not.toBeNull();
  expect(document.activeElement).toBe(dialog);
  const before = stores.trackStore.getState().tracks;
  const handle = dialog.firstElementChild as HTMLElement;
  Object.assign(handle, {
    setPointerCapture: () => undefined,
    hasPointerCapture: () => true,
    releasePointerCapture: () => undefined,
  });
  const left = Number.parseFloat(dialog.style.left) || dialog.getBoundingClientRect().left;
  const top = Number.parseFloat(dialog.style.top) || dialog.getBoundingClientRect().top;
  const pointer = (type: string, x: number, y: number) => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
    Object.defineProperty(event, "pointerId", { value: 1 });
    handle.dispatchEvent(event);
  };
  const dragged = await probe.measure(() => {
    pointer("pointerdown", left + 10, top + 10);
    pointer("pointermove", left + 110, top + 70);
    pointer("pointerup", left + 110, top + 70);
  });
  expect(dialog.style.left).toBe(`${left + 100}px`);
  expect(dialog.style.top).toBe(`${top + 60}px`);
  expect(dragged.pick("Signal")).toEqual({ Signal: 0 });
  expect(stores.trackStore.getState().tracks).toBe(before);
  await probe.measure(() =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(opener);
});
