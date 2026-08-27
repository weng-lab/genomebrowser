// @vitest-environment jsdom

import {
  createBrowserStore,
  createSettingsStore,
  createTrackStore,
  defineTrackModule,
  GenomeBrowser,
  hg38,
  type TrackBase,
  type TrackMutationResult,
  type TrackStoreInstance,
  type TrackUpdate,
} from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { bigBedModule } from "../../src/bigbed";
import type { BigBedConfig } from "../../src/bigbed/types";
import { bulkBedModule } from "../../src/bulkbed";
import type { BulkBedConfig } from "../../src/bulkbed/types";
import { TrackBaseSettings } from "../../src/shared/settings/trackBaseSettings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const base: TrackBase = {
  id: "signal",
  title: "Saved title",
  display: "full",
  height: 80,
  color: "#2266aa",
};

const signalModule = defineTrackModule({
  type: "signal",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: () => null, dense: () => null },
});

const intervalModule = defineTrackModule({
  type: "interval",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: () => null },
});

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.useRealTimers();
});

describe("TrackBaseSettings", () => {
  it("groups base fields into two semantic rows in source order", async () => {
    const updateTrack = vi.fn<(update: TrackUpdate<never>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    await mountSettings(updateTrack, ["full", "dense"]);

    const title = getInput("Title");
    const color = getInput("Color");
    const display = getSelect("Display mode");
    const height = getInput("Height");
    const controls = Array.from(
      container?.querySelectorAll('input:not(.MuiSelect-nativeInput), [role="combobox"]') ?? [],
    );

    expect(controls).toEqual([title, color, display, height]);
    expect(getFieldRow(title)).toBe(getFieldRow(color));
    expect(getFieldRow(display)).toBe(getFieldRow(height));
    expect(getFieldRow(title)).not.toBe(getFieldRow(display));
    expect(getComputedStyle(getFieldRow(title)).display).toBe("flex");
    expect(getComputedStyle(getFieldRow(title)).flexWrap).toBe("nowrap");
    expect(getComputedStyle(title.closest(".MuiFormControl-root") as HTMLElement).flex).toBe(
      "1 1 0px",
    );
    expect(getComputedStyle(color.closest(".MuiFormControl-root") as HTMLElement).minWidth).toBe(
      "0",
    );
  });

  it("omits a single unavailable display option without leaving a placeholder field", async () => {
    const updateTrack = vi.fn<(update: TrackUpdate<never>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    await mountSettings(updateTrack, ["full"]);

    expect(getOptionalSelect("Display mode")).toBeUndefined();
    const height = getInput("Height");
    expect(getFieldRow(height).querySelectorAll(".MuiFormControl-root")).toHaveLength(1);
    const heightField = getFieldItem(height);
    expect(getComputedStyle(heightField).flex).toBe("1 1 0px");
    expect(
      getComputedStyle(height.closest<HTMLElement>(".MuiFormControl-root") as HTMLElement).width,
    ).toBe("100%");
  });

  it("keeps required title and height drafts visible before valid debounced updates", async () => {
    vi.useFakeTimers();
    const updateTrack = vi.fn<(update: TrackUpdate<never>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    await mountSettings(updateTrack, ["full", "dense"]);

    const title = getInput("Title");
    const height = getInput("Height");
    updateInput(title, "");
    expect(title.value).toBe("");
    expect(container?.textContent).toContain("Enter a title.");

    updateInput(title, "Updated title");
    updateInput(height, "1.");
    act(() => vi.advanceTimersByTime(300));
    expect(updateTrack).toHaveBeenCalledWith({ base: { title: "Updated title" } });
    expect(height.value).toBe("1.");
    expect(updateTrack).toHaveBeenCalledTimes(1);

    updateInput(height, "100");
    act(() => vi.advanceTimersByTime(300));
    expect(updateTrack).toHaveBeenLastCalledWith({ base: { height: 100 } });
  });

  it("coordinates BulkBed height and row-height edits in one update", async () => {
    vi.useFakeTimers();
    const updateTrack = vi.fn<(update: TrackUpdate<BulkBedConfig>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    await mountBulkBedBaseSettings(updateTrack);

    const height = getInput("Height");
    const rowHeight = getInput("Row height");
    expect(getFieldRow(height)).toBe(getFieldRow(rowHeight));

    updateInput(height, "2");
    act(() => vi.advanceTimersByTime(300));
    expect(updateTrack).toHaveBeenLastCalledWith({
      base: { height: 2 },
      config: { rowHeight: 1 },
    });

    updateInput(rowHeight, "2");
    act(() => vi.advanceTimersByTime(300));
    expect(updateTrack).toHaveBeenLastCalledWith({
      base: { height: 4 },
      config: { rowHeight: 2 },
    });
    expect(updateTrack).toHaveBeenCalledTimes(2);
  });

  it("shows matched Height and Row height defaults for BigBed", async () => {
    const updateTrack = vi.fn<(update: TrackUpdate<BigBedConfig>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    await mountBigBedBaseSettings(updateTrack);

    const height = getInput("Height");
    const rowHeight = getInput("Row height");
    expect(height.value).toBe("12");
    expect(rowHeight.value).toBe("12");
    expect(getFieldRow(height)).toBe(getFieldRow(rowHeight));
  });

  it("keeps Height-only behavior for tracks without valid row-layout config", async () => {
    const updateTrack = vi.fn<(update: TrackUpdate<never>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    await mountSettings(updateTrack, ["full"]);

    expect(getOptionalInput("Row height")).toBeUndefined();
    expect(getInput("Height").getAttribute("min")).toBe("20");
  });

  it("applies the displayed Height to every track of the exact same type", async () => {
    vi.useFakeTimers();
    const trackStore = createTrackStore({
      modules: [signalModule, intervalModule],
      tracks: [
        signalModule.create({
          id: "signal-a",
          title: "Signal A",
          display: "full",
          height: 80,
          color: "#2266aa",
          config: {},
        }),
        signalModule.create({
          id: "signal-b",
          title: "Signal B",
          display: "full",
          height: 60,
          color: "#2266aa",
          config: {},
        }),
        intervalModule.create({
          id: "interval",
          title: "Interval",
          height: 40,
          config: {},
        }),
      ],
    });
    await mountBaseSettings(trackStore, "signal-a");

    updateInput(getInput("Height"), "100");
    act(() => vi.advanceTimersByTime(300));
    expect(trackStore.getState().getTrack("signal-a")?.base.height).toBe(100);
    expect(trackStore.getState().getTrack("signal-b")?.base.height).toBe(60);

    clickButton("Apply Height to all tracks of this type");

    expect(trackStore.getState().getTrack("signal-a")?.base.height).toBe(100);
    expect(trackStore.getState().getTrack("signal-b")?.base.height).toBe(100);
    expect(trackStore.getState().getTrack("interval")?.base.height).toBe(40);

    updateInput(getInput("Height"), "10");
    expect(getButton("Apply Height to all tracks of this type").disabled).toBe(true);
    expect(trackStore.getState().getTrack("signal-b")?.base.height).toBe(100);
  });

  it("applies Row height while preserving each matching track's row count", async () => {
    vi.useFakeTimers();
    const trackStore = createTrackStore({
      modules: [bulkBedModule, bigBedModule],
      tracks: [
        bulkBedModule.create({
          id: "bulkbed-a",
          title: "BulkBed A",
          height: 24,
          config: {
            datasets: [{ name: "Dataset A", url: "YOUR_URL_HERE" }],
            rowHeight: 12,
          },
        }),
        bulkBedModule.create({
          id: "bulkbed-b",
          title: "BulkBed B",
          height: 36,
          config: {
            datasets: [{ name: "Dataset B", url: "YOUR_URL_HERE" }],
            rowHeight: 12,
          },
        }),
        bigBedModule.create({
          id: "bigbed",
          title: "BigBed",
          height: 12,
          config: { url: "YOUR_URL_HERE", rowHeight: 12 },
        }),
      ],
    });
    await mountBaseSettings(trackStore, "bulkbed-a");

    updateInput(getInput("Row height"), "10");
    clickButton("Apply Row height to all tracks of this type");

    expect(trackStore.getState().getTrack("bulkbed-a")).toMatchObject({
      base: { height: 20 },
      config: { rowHeight: 10 },
    });
    expect(trackStore.getState().getTrack("bulkbed-b")).toMatchObject({
      base: { height: 30 },
      config: { rowHeight: 10 },
    });
    expect(trackStore.getState().getTrack("bigbed")).toMatchObject({
      base: { height: 12 },
      config: { rowHeight: 12 },
    });
  });

  it("commits valid colors and surfaces rejected mutations", async () => {
    const updateTrack = vi
      .fn<(update: TrackUpdate<never>) => TrackMutationResult>()
      .mockReturnValueOnce({ ok: false, error: "Core rejected this color." })
      .mockReturnValueOnce({ ok: true });
    await mountSettings(updateTrack, ["full", "dense"]);

    updateInput(getInput("Color"), "#abcdef");
    blurInput("Color");
    updateInput(getSelectInput(), "dense");

    expect(updateTrack).toHaveBeenNthCalledWith(1, { base: { color: "#ABCDEF" } });
    expect(updateTrack).toHaveBeenNthCalledWith(2, { base: { display: "dense" } });
    expect(getInput("Color").getAttribute("aria-invalid")).toBe("true");
    expect(container?.textContent).toContain("Core rejected this color.");
  });

  it("keeps title validation associated with its field", async () => {
    const updateTrack = vi.fn<(update: TrackUpdate<never>) => TrackMutationResult>(() => ({
      ok: true,
    }));
    await mountSettings(updateTrack, ["full", "dense"]);

    const title = getInput("Title");
    updateInput(title, "");

    const describedBy = title.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")?.textContent).toBe("Enter a title.");
    expect(updateTrack).not.toHaveBeenCalled();
  });
});

async function mount(node: React.ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(node);
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function mountSettings(
  updateTrack: (update: TrackUpdate<never>) => TrackMutationResult,
  displayOptions: readonly string[],
) {
  const module = {
    ...signalModule,
    render: Object.fromEntries(
      displayOptions.map((option) => [
        option,
        signalModule.render[option as keyof typeof signalModule.render],
      ]),
    ),
  };
  const trackStore = createTrackStore({
    modules: [module],
    tracks: [
      module.create({
        id: base.id,
        title: base.title,
        display: base.display as "full" | "dense",
        height: base.height,
        color: base.color,
        config: {},
      }),
    ],
  });
  if (updateTrack) {
    trackStore.setState({
      updateTrack: (_id, update) => updateTrack(update as TrackUpdate<never>),
    });
  }
  const settingsStore = createSettingsStore({ baseSettingsComponent: TrackBaseSettings });
  settingsStore.getState().openSettings(base.id, { x: 0, y: 0 });
  await mount(
    <GenomeBrowser
      browserStore={createBrowserStore({
        assembly: hg38,
        region: { chromosome: "chr1", start: 0, end: 10 },
      })}
      settingsStore={settingsStore}
      trackStore={trackStore}
    />,
  );
}

async function mountBaseSettings(trackStore: TrackStoreInstance, trackId: string) {
  const settingsStore = createSettingsStore({ baseSettingsComponent: TrackBaseSettings });
  settingsStore.getState().openSettings(trackId, { x: 0, y: 0 });
  await mount(
    <GenomeBrowser
      browserStore={createBrowserStore({
        assembly: hg38,
        region: { chromosome: "chr1", start: 0, end: 10 },
      })}
      settingsStore={settingsStore}
      trackStore={trackStore}
    />,
  );
}

async function mountBulkBedBaseSettings(
  updateTrack: (update: TrackUpdate<BulkBedConfig>) => TrackMutationResult,
) {
  const trackStore = createTrackStore({
    modules: [bulkBedModule],
    tracks: [
      bulkBedModule.create({
        id: "bulkbed",
        title: "BulkBed",
        display: "full",
        height: 24,
        color: "#2266aa",
        config: {
          datasets: [
            { name: "Dataset A", url: "YOUR_URL_HERE" },
            { name: "Dataset B", url: "YOUR_URL_HERE" },
          ],
          rowHeight: 12,
        },
      }),
    ],
  });
  trackStore.setState({
    updateTrack: (_id, update) => updateTrack(update as TrackUpdate<BulkBedConfig>),
  });
  const settingsStore = createSettingsStore({ baseSettingsComponent: TrackBaseSettings });
  settingsStore.getState().openSettings("bulkbed", { x: 0, y: 0 });
  await mount(
    <GenomeBrowser
      browserStore={createBrowserStore({
        assembly: hg38,
        region: { chromosome: "chr1", start: 0, end: 10 },
      })}
      settingsStore={settingsStore}
      trackStore={trackStore}
    />,
  );
}

async function mountBigBedBaseSettings(
  updateTrack: (update: TrackUpdate<BigBedConfig>) => TrackMutationResult,
) {
  const trackStore = createTrackStore({
    modules: [bigBedModule],
    tracks: [
      bigBedModule.create({
        id: "bigbed",
        title: "BigBed",
        config: { url: "YOUR_URL_HERE" },
      }),
    ],
  });
  trackStore.setState({
    updateTrack: (_id, update) => updateTrack(update as TrackUpdate<BigBedConfig>),
  });
  const settingsStore = createSettingsStore({ baseSettingsComponent: TrackBaseSettings });
  settingsStore.getState().openSettings("bigbed", { x: 0, y: 0 });
  await mount(
    <GenomeBrowser
      browserStore={createBrowserStore({
        assembly: hg38,
        region: { chromosome: "chr1", start: 0, end: 10 },
      })}
      settingsStore={settingsStore}
      trackStore={trackStore}
    />,
  );
}

function getInput(label: string) {
  const input = getOptionalInput(label);
  if (!input) throw new Error(`Could not find input labeled ${label}`);
  return input;
}

function getOptionalInput(label: string) {
  const input = Array.from(container?.querySelectorAll<HTMLInputElement>("input") ?? []).find(
    (candidate) =>
      Array.from(candidate.labels ?? []).some(
        (element) => element.textContent?.replace("*", "").trim() === label,
      ),
  );
  return input;
}

function getSelect(label: string) {
  const select = getOptionalSelect(label);
  if (!select) throw new Error(`Could not find select labeled ${label}`);
  return select;
}

function getOptionalSelect(label: string) {
  const select = container?.querySelector<HTMLElement>('[role="combobox"]');
  if (!select) return undefined;

  const labelIds = select.getAttribute("aria-labelledby")?.split(" ") ?? [];
  return labelIds.some((id) => document.getElementById(id)?.textContent?.trim() === label)
    ? select
    : undefined;
}

function getSelectInput() {
  const input = container?.querySelector<HTMLInputElement>(".MuiSelect-nativeInput");
  if (!input) throw new Error("Could not find native select input");
  return input;
}

function getButton(label: string) {
  const button = Array.from(container?.querySelectorAll<HTMLButtonElement>("button") ?? []).find(
    (candidate) => candidate.getAttribute("aria-label") === label,
  );
  if (!button) throw new Error(`Could not find button labeled ${label}`);
  return button;
}

function clickButton(label: string) {
  act(() => getButton(label).click());
}

function getFieldRow(control: Element) {
  const item = getFieldItem(control);
  const row = item.parentElement;
  if (!row) throw new Error("Could not find field row");
  return row;
}

function getFieldItem(control: Element) {
  const field = control.closest(".MuiFormControl-root");
  if (!field) throw new Error("Could not find field");
  const parent = field.parentElement;
  const hasDimensionAction = Array.from(parent?.children ?? []).some((child) =>
    child.matches('button[aria-label^="Apply "]'),
  );
  return hasDimensionAction && parent ? parent : field;
}

function updateInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!valueSetter) throw new Error("Input value setter is unavailable");
  act(() => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function blurInput(label: string) {
  act(() => getInput(label).dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
}
