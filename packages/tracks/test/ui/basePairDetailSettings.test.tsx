// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { GenomeBrowser, createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { rulerModule } from "../../src/ruler";
import { bamModule } from "../../src/bam";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
const container = document.createElement("div");
let root: ReturnType<typeof createRoot> | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  container.remove();
});
async function setup({
  width = 1000,
  span = 240,
  sequence = true,
  display = "pack",
}: { width?: number; span?: number; sequence?: boolean; display?: "pack" | "squish" } = {}) {
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 1000 + span },
    trackWidth: width,
  });
  const trackStore = createTrackStore({
    modules: [
      { ...rulerModule, fetch: async () => ({ records: [] }) },
      { ...bamModule, fetch: async () => ({ records: [], reference: [] }) },
    ],
    tracks: [
      rulerModule.create({
        base: { id: "ruler", title: "Ruler" },
        config: { sequenceUrl: sequence ? "https://example.test/reference.2bit" : undefined },
      }),
      bamModule.create({
        base: { id: "bam", title: "BAM", display },
        config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" },
      }),
    ],
  });
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
    ),
  );
  return { browserStore, trackStore };
}
async function click(label: string) {
  const target = [...container.querySelectorAll<HTMLElement>('button, [role="button"]')].find(
    (button) => button.getAttribute("aria-label") === label || button.textContent === label,
  );
  expect(target, label).toBeDefined();
  await act(async () => target!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}
function cutoff() {
  const label = [...container.querySelectorAll("label")].find(
    (label) => label.textContent === "Show letters when viewing up to",
  )!;
  return document.getElementById(label.htmlFor) as HTMLInputElement;
}
async function type(value: string) {
  await act(async () => {
    const input = cutoff();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function key(key: string) {
  await act(async () =>
    cutoff().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })),
  );
}
it("shares the cutoff between ruler and BAM, commits deliberately, and retains invalid drafts", async () => {
  const { browserStore } = await setup();
  await click("Settings for Ruler");
  expect(container.textContent).toContain("Shared across all tracks.");
  expect(container.textContent).toContain("Viewing 240 bp");
  await type("250");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  expect(browserStore.getState().basePairDetail.maxVisibleBases).toBe(100);
  await key("Enter");
  expect(browserStore.getState().basePairDetail.maxVisibleBases).toBe(250);
  expect(container.textContent).toContain("Letters need more room");
  await type("0");
  await key("Enter");
  expect(cutoff().value).toBe("0");
  expect(container.textContent).toContain("Enter a whole number");
  expect(browserStore.getState().basePairDetail.maxVisibleBases).toBe(250);
  await key("Escape");
  expect(cutoff().value).toBe("250");
  await click("Close settings");
  await click("Settings for BAM");
  expect(cutoff().value).toBe("250");
  await type("300");
  await act(async () => cutoff().dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
  expect(browserStore.getState().basePairDetail.maxVisibleBases).toBe(300);
  await click("Close settings");
  await click("Settings for Ruler");
  expect(cutoff().value).toBe("300");
});
it("zooms around the center far enough for a narrow plot to show letters", async () => {
  const { browserStore } = await setup({ width: 400, span: 80 });
  await click("Settings for BAM");
  expect(container.textContent).toContain("Letters need more room");
  await act(async () => {
    browserStore.getState().setRegion({ chromosome: "chr1", start: 1000, end: 1240 });
  });
  expect(container.textContent).toContain(
    "Zoom in to 50 bp or less for readable letters at this width.",
  );
  await click("Zoom to letters");
  expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 1095, end: 1145 });
  expect(container.textContent).toContain("This view allows letters");
  expect(container.textContent).not.toContain("Zoom to letters");
});
it("explains track-specific prerequisites instead of offering an ineffective zoom action", async () => {
  await setup({ sequence: false, display: "squish" });
  await click("Settings for Ruler");
  expect(container.textContent).toContain("Add a reference 2bit URL below");
  expect(container.textContent).not.toContain("Zoom to letters");
  await click("Close settings");
  await click("Settings for BAM");
  expect(container.textContent).toContain("Choose Pack or Full display above");
  expect(container.textContent).not.toContain("Zoom to letters");
});
