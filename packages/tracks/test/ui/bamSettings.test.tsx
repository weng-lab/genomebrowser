// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { bamModule, type BamConfigInput } from "@weng-lab/genomebrowser-tracks/bam";
import { mountTrack, type MountedTrack } from "../mountTrack";

let view: MountedTrack;
let container: HTMLDialogElement;
const defaults = bamModule.create({
  base: { id: "bam", title: "BAM" },
  config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" },
}).config;
/** Mounts a BAM track in a browser and opens its settings the way a user does. */
async function setup(source: "host" | "user", config: Partial<BamConfigInput> = {}) {
  view = await mountTrack({
    module: bamModule,
    track: {
      source,
      base: { id: "bam", title: "BAM" },
      config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE", ...config },
    },
    data: { records: [], reference: [] },
    region: { chromosome: "chr1", start: 0, end: 1000 },
  });
  container = await view.openSettings();
  const mountedView = view;
  /** The track config the browser stores after the panel's updates. */
  return () => bamModule.validate(mountedView.trackStore.getState().getTrack("bam")).config;
}
const settle = (update: () => unknown) => view.settle(update);
function duplicatesCheckbox() {
  return [...container.querySelectorAll("label")]
    .find((label) => label.textContent === "Show duplicate reads")!
    .querySelector<HTMLInputElement>('input[type="checkbox"]')!;
}
describe("BAM settings", () => {
  it("commits the index URL explicitly and exposes filtering and display controls", async () => {
    const config = await setup("user");
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
      expect(container.textContent).toContain(label);
    const index = container.querySelectorAll<HTMLInputElement>('input[type="url"]')[1];
    await settle(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        index,
        "UPDATED_INDEX",
      );
      index.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(config()).toEqual(defaults);
    await settle(() =>
      container.querySelector<HTMLButtonElement>('button[aria-label="Set BAI URL"]')!.click(),
    );
    expect(config().indexUrl).toBe("UPDATED_INDEX");
    await settle(() => duplicatesCheckbox().click());
    expect(config().filters).toEqual({ ...defaults.filters, includeDuplicates: false });
  });
  it("locks all host-owned source URLs while allowing display settings", async () => {
    await setup("host");
    const urls = container.querySelectorAll<HTMLInputElement>('input[type="url"]');
    expect(urls).toHaveLength(3);
    expect([...urls].every((input) => input.disabled)).toBe(true);
    expect(duplicatesCheckbox().disabled).toBe(false);
    expect(container.querySelector('[role="combobox"]')?.getAttribute("aria-disabled")).not.toBe(
      "true",
    );
  });
});

const enter = async (input: HTMLInputElement, value: string) => {
  await settle(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(() =>
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
};
const inputFor = (name: string) => {
  const label = [...container.querySelectorAll("label")].find(
    (label) => label.textContent?.replace(/\s*\*$/, "").trim() === name,
  )!;
  return document.getElementById(label.htmlFor) as HTMLInputElement;
};

it("uses explicit strand controls and commits whole strand color groups for host tracks", async () => {
  const config = await setup("host");
  const labels = [...container.querySelectorAll("label")];
  expect(labels.some((label) => label.textContent?.replace(/\s*\*$/, "").trim() === "Color")).toBe(
    false,
  );
  // Each commit keeps the stored color of the other strand, including earlier edits.
  for (const [name, value, expected] of [
    ["Forward color", "#123456", { forward: "#123456", reverse: defaults.strandColors.reverse }],
    ["Reverse color", "#654321", { forward: "#123456", reverse: "#654321" }],
  ] as const) {
    const input = inputFor(name);
    expect(input.disabled).toBe(false);
    await enter(input, value);
    expect(config().strandColors).toEqual(expected);
  }
});

it("shows controls for enabled sections and keeps at least one section visible", async () => {
  const config = await setup("user");
  const text = container.textContent;
  expect(text).toContain("Coverage height");
  expect(text).toContain("Row height");
  expect(text).not.toContain("Minimum supporting alignments");
  const switchFor = (name: string) =>
    [...container.querySelectorAll("label")]
      .find((label) => label.textContent === name)!
      .querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  await settle(() => switchFor("Splice junctions").click());
  expect(config().junctions).toEqual({ ...defaults.junctions, show: true });
  expect(container.textContent).toContain("Minimum supporting alignments");
  expect(switchFor("Coverage").disabled).toBe(false);

  await setup("user", { alignments: { show: false } });
  expect(switchFor("Coverage").disabled).toBe(true);
  expect(container.textContent).not.toContain("Row height");
  expect(container.textContent).toContain("Strand colors");
  expect(container.textContent).toContain("Forward color");
  expect(container.textContent).toContain("Reverse color");
  expect(container.textContent).not.toContain("Coverage color");
  expect(container.textContent).not.toContain("Junction color");
  expect(container.textContent).toContain("Enable Alignments above");
  expect(container.textContent).not.toContain("Show letters ·");
});

it("rejects unsafe intron spans and allows a valid span to be cleared", async () => {
  const config = await setup("user", { junctions: { show: true, maximumSpan: 100 } });
  const input = inputFor("Maximum intron span (bp)");
  for (const invalid of ["9007199254740992", "9".repeat(400)]) {
    await enter(input, invalid);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(config().junctions.maximumSpan).toBe(100);
  }
  await enter(input, String(Number.MAX_SAFE_INTEGER));
  expect(input.getAttribute("aria-invalid")).toBe("false");
  expect(config().junctions.maximumSpan).toBe(Number.MAX_SAFE_INTEGER);
  await enter(input, "");
  expect(input.getAttribute("aria-invalid")).toBe("false");
  expect(config().junctions.maximumSpan).toBeUndefined();
});

it("accepts a positive coverage maximum, rejects invalid limits, and clears to auto", async () => {
  const config = await setup("user");
  const input = inputFor("Forward maximum");
  expect(input.value).toBe("");
  expect(input.placeholder).toBe("Auto");
  for (const invalid of ["0", "-1", "Infinity", "oops"]) {
    await enter(input, invalid);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(config()).toEqual(defaults);
  }
  await enter(input, "2.5");
  expect(config().coverage).toEqual({
    ...defaults.coverage,
    scale: { mode: "fixed", forwardMax: 2.5 },
  });
  await enter(input, " ");
  expect(input.getAttribute("aria-invalid")).toBe("false");
  expect(config().coverage).toEqual({ ...defaults.coverage, scale: { mode: "auto" } });
  const toggle = [...container.querySelectorAll("label")]
    .find((label) => label.textContent === "Show clamp indicators")!
    .querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  expect(toggle.checked).toBe(true);
  await settle(() => toggle.click());
  expect(config().coverage).toEqual({ ...defaults.coverage, showClampIndicators: false });
});

it("edits or clears one strand limit while preserving the other", async () => {
  const config = await setup("user", {
    coverage: { scale: { mode: "fixed", forwardMax: 3, reverseMax: 7 } },
  });
  const forward = inputFor("Forward maximum");
  const reverse = inputFor("Reverse maximum");
  expect(forward.value).toBe("3");
  expect(reverse.value).toBe("7");
  await enter(forward, "");
  expect(config().coverage.scale).toEqual({ mode: "fixed", reverseMax: 7 });
  expect(forward.value).toBe("");
  await enter(reverse, "9");
  expect(config().coverage.scale).toEqual({ mode: "fixed", reverseMax: 9 });
  expect(reverse.value).toBe("9");
  await enter(forward, "3");
  expect(config().coverage.scale).toEqual({ mode: "fixed", forwardMax: 3, reverseMax: 9 });
});
