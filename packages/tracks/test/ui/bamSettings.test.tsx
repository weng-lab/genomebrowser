// @vitest-environment jsdom
import { type ModuleCreateInput, type TrackStoreInstance } from "@weng-lab/genomebrowser";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { bamModule } from "@weng-lab/genomebrowser-tracks/bam";
import type { BamConfig } from "../../src/bam/schema";
import { openTrackSettings } from "../testBrowser";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let container: Element;
let defaults: BamConfig;
let useTrackStore: TrackStoreInstance;

async function setup(
  source: "host" | "user",
  config: Omit<ModuleCreateInput<typeof bamModule>["config"], "url" | "indexUrl"> = {},
) {
  const track = bamModule.create({
    source,
    base: { id: "bam", title: "BAM" },
    config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE", ...config },
  });
  defaults = track.config;
  const settings = await openTrackSettings(bamModule, track);
  container = settings.dialog;
  useTrackStore = settings.trackStore;
  return settings;
}

function storedConfig() {
  return bamModule.validate(useTrackStore.getState().getTrack("bam")).config;
}

function inputLabeled(name: string) {
  const label = [...container!.querySelectorAll("label")].find(
    (label) => label.textContent?.replace(/\s*\*$/, "").trim() === name,
  )!;
  return document.getElementById(label.htmlFor) as HTMLInputElement;
}

function typeInto(input: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function pressEnter(input: HTMLInputElement) {
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}
function duplicatesCheckbox() {
  return [...container!.querySelectorAll("label")]
    .find((label) => label.textContent === "Show duplicate reads")!
    .querySelector<HTMLInputElement>('input[type="checkbox"]')!;
}
describe("BAM settings", () => {
  it("commits the index URL explicitly and exposes filtering and display controls", async () => {
    await setup("user");
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
    expect(storedConfig()).toEqual(defaults);
    // A new index URL refetches the track; wait for the browser to settle again.
    await act(async () =>
      container!.querySelector<HTMLButtonElement>('button[aria-label="Set BAI URL"]')!.click(),
    );
    expect(storedConfig().indexUrl).toBe("UPDATED_INDEX");
    act(() => duplicatesCheckbox().click());
    expect(storedConfig().filters).toEqual({ ...defaults.filters, includeDuplicates: false });
  });
  it("locks all host-owned source URLs while allowing display settings", async () => {
    await setup("host");
    const urls = container!.querySelectorAll<HTMLInputElement>('input[type="url"]');
    expect(urls).toHaveLength(3);
    expect([...urls].every((input) => input.disabled)).toBe(true);
    expect(duplicatesCheckbox().disabled).toBe(false);
    expect(container!.querySelector('[role="combobox"]')?.getAttribute("aria-disabled")).not.toBe(
      "true",
    );
  });
});

it("uses explicit strand controls and commits whole strand color groups for host tracks", async () => {
  await setup("host");
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
    act(() => pressEnter(input));
    expect(storedConfig().strandColors).toMatchObject(expected);
  }
  expect(storedConfig().strandColors).toEqual({ forward: "#123456", reverse: "#654321" });
});

it("keeps both strand colors when their edits commit in one batch", async () => {
  await setup("user");
  const forward = inputLabeled("Forward color");
  const reverse = inputLabeled("Reverse color");
  typeInto(forward, "#123456");
  typeInto(reverse, "#654321");
  act(() => {
    // React has not re-rendered the form between these commits.
    pressEnter(forward);
    pressEnter(reverse);
  });
  expect(storedConfig().strandColors).toEqual({ forward: "#123456", reverse: "#654321" });
});

it("shows controls for enabled sections and keeps at least one section visible", async () => {
  const { unmount } = await setup("user");
  const text = container!.textContent;
  expect(text).toContain("Coverage height");
  expect(text).toContain("Row height");
  expect(text).not.toContain("Minimum supporting alignments");
  const switchFor = (name: string) =>
    [...container!.querySelectorAll("label")]
      .find((label) => label.textContent === name)!
      .querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  act(() => switchFor("Splice junctions").click());
  expect(storedConfig().junctions).toEqual({ ...defaults.junctions, show: true });
  expect(switchFor("Coverage").disabled).toBe(false);

  unmount();
  await setup("user", { alignments: { show: false } });
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

it("rejects unsafe intron spans and allows a valid span to be cleared", async () => {
  await setup("user", { junctions: { show: true, maximumSpan: 100 } });
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

it("accepts a positive coverage maximum, rejects invalid limits, and clears to auto", async () => {
  await setup("user");
  const input = inputLabeled("Forward maximum");
  expect(input.value).toBe("");
  expect(input.placeholder).toBe("Auto");
  const enter = (value: string) => {
    typeInto(input, value);
    act(() => pressEnter(input));
  };
  for (const invalid of ["0", "-1", "Infinity", "oops"]) {
    enter(invalid);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(storedConfig()).toEqual(defaults);
  }
  enter("2.5");
  expect(storedConfig().coverage).toEqual({
    ...defaults.coverage,
    scale: { mode: "fixed", forwardMax: 2.5 },
  });
  enter(" ");
  expect(input.getAttribute("aria-invalid")).toBe("false");
  expect(storedConfig().coverage).toEqual({ ...defaults.coverage, scale: { mode: "auto" } });
  const toggle = [...container!.querySelectorAll("label")]
    .find((label) => label.textContent === "Show clamp indicators")!
    .querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  expect(toggle.checked).toBe(true);
  act(() => toggle.click());
  expect(storedConfig().coverage.showClampIndicators).toBe(false);
});

it("edits or clears one strand limit while preserving the other", async () => {
  await setup("user", { coverage: { scale: { mode: "fixed", forwardMax: 3, reverseMax: 7 } } });
  const forward = inputLabeled("Forward maximum");
  const reverse = inputLabeled("Reverse maximum");
  expect(forward.value).toBe("3");
  expect(reverse.value).toBe("7");
  typeInto(forward, "");
  act(() => pressEnter(forward));
  expect(storedConfig().coverage.scale).toEqual({ mode: "fixed", reverseMax: 7 });
  typeInto(forward, "4");
  typeInto(reverse, "9");
  act(() => {
    pressEnter(forward);
    pressEnter(reverse);
  });
  expect(storedConfig().coverage.scale).toEqual({ mode: "fixed", forwardMax: 4, reverseMax: 9 });
});
