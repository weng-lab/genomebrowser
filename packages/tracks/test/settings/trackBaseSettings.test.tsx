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
  type TrackUpdate,
} from "@weng-lab/genomebrowser";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
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
    const heightField = height.closest<HTMLElement>(".MuiFormControl-root");
    expect(heightField).toBeTruthy();
    expect(getComputedStyle(heightField as HTMLElement).flex).toBe("1 1 0px");
    expect(getComputedStyle(heightField as HTMLElement).width).toBe("100%");
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

function getFieldRow(control: Element) {
  const field = control.closest(".MuiFormControl-root");
  const row = field?.parentElement;
  if (!row) throw new Error("Could not find field row");
  return row;
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
