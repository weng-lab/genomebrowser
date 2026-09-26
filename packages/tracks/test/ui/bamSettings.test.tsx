import { createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { BrowserContext } from "../../../core/src/browser/state/browserContextState";
import { BasePairDetailContext } from "../../../core/src/browser/viewport/basePairDetail";
import { createSettingsStore } from "../../../core/src/browser/state/settingsStore";
import { createContextMenuStore } from "../../../core/src/browser/state/contextMenuStore";
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bamModule } from "@weng-lab/genomebrowser-tracks/bam";
import { BamSettings } from "../../src/bam/settings";
import type { BamConfig } from "../../src/bam/types";

const detailStatus = { reason: "viewport" as const, zoomTargetBases: 100 };
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});
let defaults: BamConfig;
function setup(source: "host" | "user") {
  const track = bamModule.create({
    source,
    base: { id: "bam", title: "BAM" },
    config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" },
  });
  const update = vi.fn(() => ({ ok: true as const }));
  defaults = track.config;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const context = {
    browserStore: createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 10000 } },
      region: { chromosome: "chr1", start: 0, end: 1000 },
    }),
    trackStore: createTrackStore({ modules: [], tracks: [] }),
    settingsStore: createSettingsStore(),
    contextMenuStore: createContextMenuStore(),
  };
  act(() =>
    root?.render(
      <BasePairDetailContext
        value={{
          subscribe: () => () => {},
          getBasePairDetail: () => false,
          getBasePairDetailStatus: () => detailStatus,
        }}
      >
        <BrowserContext value={context}>
          <BamSettings
            track={track}
            displayOptions={bamModule.displays}
            updateTrack={update}
            updateTracksOfType={() => ({ ok: true })}
          />
        </BrowserContext>
      </BasePairDetailContext>,
    ),
  );
  return update;
}
describe("BAM settings", () => {
  it("commits the index URL explicitly and exposes filtering and display controls", () => {
    const update = setup("user");
    for (const label of [
      "Display mode",
      "BAM URL",
      "BAI URL",
      "Reference 2bit URL",
      "Minimum mapping quality",
      "Forward color",
      "Reverse color",
      "Row height",
    ])
      expect(container!.textContent).toContain(label);
    const index = container!.querySelectorAll<HTMLInputElement>('input[type="url"]')[1];
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        index,
        "UPDATED_INDEX",
      );
      index.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(update).not.toHaveBeenCalled();
    act(() =>
      container!.querySelector<HTMLButtonElement>('button[aria-label="Set BAI URL"]')!.click(),
    );
    expect(update).toHaveBeenCalledWith({ config: { indexUrl: "UPDATED_INDEX" } });
    act(() => container!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    expect(update).toHaveBeenCalledWith({
      config: { filters: { ...defaults.filters, includeDuplicates: false } },
    });
  });
  it("locks all host-owned source URLs while allowing display settings", () => {
    setup("host");
    const urls = container!.querySelectorAll<HTMLInputElement>('input[type="url"]');
    expect(urls).toHaveLength(3);
    expect([...urls].every((input) => input.disabled)).toBe(true);
    expect(container!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.disabled).toBe(
      false,
    );
    expect(container!.querySelector('[role="combobox"]')?.getAttribute("aria-disabled")).not.toBe(
      "true",
    );
  });
});

it("uses explicit strand controls and commits whole alignment groups for host tracks", () => {
  const update = setup("host");
  const labels = [...container!.querySelectorAll("label")];
  expect(labels.some((label) => label.textContent?.replace(/\s*\*$/, "").trim() === "Color")).toBe(
    false,
  );
  for (const [name, value, expected] of [
    ["Forward color", "#123456", { forwardColor: "#123456" }],
    ["Reverse color", "#654321", { reverseColor: "#654321" }],
  ] as const) {
    const label = labels.find((label) => label.textContent?.replace(/\s*\*$/, "").trim() === name)!;
    const input = document.getElementById(label.htmlFor) as HTMLInputElement;
    expect(input.disabled).toBe(false);
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(update).toHaveBeenLastCalledWith({
      config: { alignments: { ...defaults.alignments, ...expected } },
    });
  }
});
