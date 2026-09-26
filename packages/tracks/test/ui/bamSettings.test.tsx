import { createTrackStore } from "@weng-lab/genomebrowser";
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bamModule, type BamRecord } from "@weng-lab/genomebrowser-tracks/bam";
import { BamSettings } from "../../src/bam/settings";
import type { BamConfig } from "../../src/bam/types";
import { TestBrowser } from "../testBrowser";
import { type TrackUpdate } from "@weng-lab/genomebrowser";

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
  act(() =>
    root?.render(
      <TestBrowser>
        <BamSettings
          track={track}
          displayOptions={bamModule.displays}
          updateTrack={update}
          updateTracksOfType={() => ({ ok: true })}
        />
      </TestBrowser>,
    ),
  );
  return update;
}
function duplicatesCheckbox() {
  return [...container!.querySelectorAll("label")]
    .find((label) => label.textContent === "Show duplicate reads")!
    .querySelector<HTMLInputElement>('input[type="checkbox"]')!;
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
    act(() => duplicatesCheckbox().click());
    expect(update).toHaveBeenCalledWith({
      config: { filters: { ...defaults.filters, includeDuplicates: false } },
    });
  });
  it("locks all host-owned source URLs while allowing display settings", () => {
    setup("host");
    const urls = container!.querySelectorAll<HTMLInputElement>('input[type="url"]');
    expect(urls).toHaveLength(3);
    expect([...urls].every((input) => input.disabled)).toBe(true);
    expect(duplicatesCheckbox().disabled).toBe(false);
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

it("shows controls for enabled sections and keeps at least one section visible", () => {
  const update = setup("user");
  const text = container!.textContent;
  expect(text).toContain("Coverage height");
  expect(text).toContain("Row height");
  expect(text).not.toContain("Minimum supporting alignments");
  const switchFor = (name: string) =>
    [...container!.querySelectorAll("label")]
      .find((label) => label.textContent === name)!
      .querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  act(() => switchFor("Splice junctions").click());
  expect(update).toHaveBeenLastCalledWith({
    config: { junctions: { ...defaults.junctions, show: true } },
  });
  expect(switchFor("Coverage").disabled).toBe(false);

  act(() => root?.unmount());
  root = createRoot(container!);
  const coverageOnly = bamModule.create({
    base: { id: "bam", title: "BAM" },
    config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE", alignments: { show: false } },
  });
  act(() =>
    root?.render(
      <TestBrowser>
        <BamSettings
          track={coverageOnly}
          displayOptions={bamModule.displays}
          updateTrack={update}
          updateTracksOfType={() => ({ ok: true })}
        />
      </TestBrowser>,
    ),
  );
  expect(switchFor("Coverage").disabled).toBe(true);
  expect(container!.textContent).not.toContain("Row height");
  expect(container!.textContent).toContain("Enable Alignments above");
  expect(container!.textContent).not.toContain("Show letters ·");
});

it("rejects unsafe intron spans and allows a valid span to be cleared", () => {
  const useTrackStore = createTrackStore({
    modules: [bamModule],
    tracks: [
      bamModule.create({
        base: { id: "bam", title: "BAM" },
        config: {
          url: "YOUR_URL_HERE",
          indexUrl: "YOUR_URL_HERE",
          junctions: { show: true, maximumSpan: 100 },
        },
      }),
    ],
  });
  const update = vi.fn((patch: TrackUpdate<BamConfig, BamRecord>) =>
    useTrackStore.getState().updateTrack("bam", patch),
  );
  function Settings() {
    const track = useTrackStore((state) => state.getTrack("bam"))!;
    return (
      <BamSettings
        track={bamModule.validate(track)}
        displayOptions={bamModule.displays}
        updateTrack={update}
        updateTracksOfType={() => ({ ok: true })}
      />
    );
  }
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root!.render(
      <TestBrowser>
        <Settings />
      </TestBrowser>,
    ),
  );
  const label = [...container.querySelectorAll("label")].find(
    (label) => label.textContent === "Maximum intron span (bp)",
  )!;
  const input = document.getElementById(label.htmlFor) as HTMLInputElement;
  const enter = (value: string) => {
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  };
  for (const invalid of ["9007199254740992", "9".repeat(400)]) {
    enter(invalid);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(update).not.toHaveBeenCalled();
    expect(
      bamModule.validate(useTrackStore.getState().getTrack("bam")).config.junctions.maximumSpan,
    ).toBe(100);
  }
  enter(String(Number.MAX_SAFE_INTEGER));
  expect(input.getAttribute("aria-invalid")).toBe("false");
  expect(
    bamModule.validate(useTrackStore.getState().getTrack("bam")).config.junctions.maximumSpan,
  ).toBe(Number.MAX_SAFE_INTEGER);
  enter("");
  expect(input.getAttribute("aria-invalid")).toBe("false");
  expect(
    bamModule.validate(useTrackStore.getState().getTrack("bam")).config.junctions.maximumSpan,
  ).toBeUndefined();
});
