import { createTrackStore } from "@weng-lab/genomebrowser";
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bamModule, type BamRecord } from "@weng-lab/genomebrowser-tracks/bam";
import { BamSettings } from "../../src/bam/settings";
import type { BamConfig } from "../../src/bam/schema";
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
function setup(source: "host" | "user", coverage?: Partial<BamConfig["coverage"]>) {
  const track = bamModule.create({
    source,
    base: { id: "bam", title: "BAM" },
    config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE", coverage },
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

it("uses explicit strand controls and commits whole strand color groups for host tracks", () => {
  const update = setup("host");
  const labels = [...container!.querySelectorAll("label")];
  expect(labels.some((label) => label.textContent?.replace(/\s*\*$/, "").trim() === "Color")).toBe(
    false,
  );
  for (const [name, value, expected] of [
    ["Forward color", "#123456", { forward: "#123456" }],
    ["Reverse color", "#654321", { reverse: "#654321" }],
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
      config: { strandColors: { ...defaults.strandColors, ...expected } },
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
  expect(container!.textContent).toContain("Strand colors");
  expect(container!.textContent).toContain("Forward color");
  expect(container!.textContent).toContain("Reverse color");
  expect(container!.textContent).not.toContain("Coverage color");
  expect(container!.textContent).not.toContain("Junction color");
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

it("accepts a positive coverage maximum, rejects invalid limits, and clears to auto", () => {
  const update = setup("user");
  const label = [...container!.querySelectorAll("label")].find(
    (label) => label.textContent === "Forward maximum",
  )!;
  const input = document.getElementById(label.htmlFor) as HTMLInputElement;
  expect(input.value).toBe("");
  expect(input.placeholder).toBe("Auto");
  const enter = (value: string) => {
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  };
  for (const invalid of ["0", "-1", "Infinity", "oops"]) {
    enter(invalid);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(update).not.toHaveBeenCalled();
  }
  enter("2.5");
  expect(update).toHaveBeenLastCalledWith({
    config: { coverage: { ...defaults.coverage, scale: { mode: "fixed", forwardMax: 2.5 } } },
  });
  update.mockClear();
  enter(" ");
  expect(input.getAttribute("aria-invalid")).toBe("false");
  expect(update).toHaveBeenLastCalledWith({
    config: { coverage: { ...defaults.coverage, scale: { mode: "auto" } } },
  });
  const toggle = [...container!.querySelectorAll("label")]
    .find((label) => label.textContent === "Show clamp indicators")!
    .querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  expect(toggle.checked).toBe(true);
  act(() => toggle.click());
  expect(update).toHaveBeenLastCalledWith({
    config: { coverage: { ...defaults.coverage, showClampIndicators: false } },
  });
});

it("edits or clears one strand limit while preserving the other", () => {
  const update = setup("user", { scale: { mode: "fixed", forwardMax: 3, reverseMax: 7 } });
  const inputFor = (name: string) => {
    const label = [...container!.querySelectorAll("label")].find(
      (label) => label.textContent === name,
    )!;
    return document.getElementById(label.htmlFor) as HTMLInputElement;
  };
  const forward = inputFor("Forward maximum");
  const reverse = inputFor("Reverse maximum");
  expect(forward.value).toBe("3");
  expect(reverse.value).toBe("7");
  const enter = (input: HTMLInputElement, value: string) => {
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  };
  enter(forward, "");
  expect(update).toHaveBeenLastCalledWith({
    config: {
      coverage: {
        ...defaults.coverage,
        scale: { mode: "fixed", forwardMax: undefined, reverseMax: 7 },
      },
    },
  });
  enter(reverse, "9");
  expect(update).toHaveBeenLastCalledWith({
    config: {
      coverage: { ...defaults.coverage, scale: { mode: "fixed", forwardMax: 3, reverseMax: 9 } },
    },
  });
});
