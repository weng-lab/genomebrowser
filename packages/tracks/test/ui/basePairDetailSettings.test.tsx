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
function slider() {
  return container.querySelector('input[type="range"]') as HTMLInputElement;
}
async function slide(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      slider(),
      value,
    );
    slider().dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("shares the letter zoom between ruler and BAM and limits it to readable spans", async () => {
  const { browserStore } = await setup();
  await click("Settings for Ruler");
  expect(slider().max).toBe("125");
  await slide("75");
  expect(browserStore.getState().basePairDetail.maxVisibleBases).toBe(75);
  await click("Close settings");
  await click("Settings for BAM");
  expect(slider().value).toBe("75");
  await slide("125");
  await click("Show letters · 125 bp");
  expect(browserStore.getState().region.end - browserStore.getState().region.start).toBe(125);
  expect(container.textContent).toContain("Letter view enabled");
});
it("shows an achievable target on narrow plots without overwriting the stored preference", async () => {
  const { browserStore } = await setup({ width: 400, span: 240 });
  await click("Settings for BAM");
  expect(slider().value).toBe("50");
  expect(slider().max).toBe("50");
  expect(browserStore.getState().basePairDetail.maxVisibleBases).toBe(100);
  await click("Show letters · 50 bp");
  expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 1095, end: 1145 });
  expect(container.textContent).toContain("Letter view enabled");
});
it("explains track prerequisites instead of offering an ineffective zoom action", async () => {
  await setup({ sequence: false, display: "squish" });
  await click("Settings for Ruler");
  expect(container.textContent).toContain("Add a reference 2bit URL below");
  expect(container.textContent).not.toContain("Show letters ·");
  await click("Close settings");
  await click("Settings for BAM");
  expect(container.textContent).toContain("Choose Pack or Full display above");
  expect(container.textContent).not.toContain("Show letters ·");
});
