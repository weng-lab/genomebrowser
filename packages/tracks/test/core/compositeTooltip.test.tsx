// @vitest-environment jsdom
import { renderWithProbe } from "@weng-lab/render-probe";
import { expect, it } from "vitest";
import { createBrowserStore, createTrackStore, GenomeBrowser } from "@weng-lab/genomebrowser";
import { compositeModule } from "../../src/composite";
import { bigWigModule } from "../../src/bigwig";
import { bigBedModule } from "../../src/bigbed";

it("combines real signal and feature tooltip content through registered modules", async () => {
  const signal = {
    ...bigWigModule,
    fetch: async () => [
      { kind: "value" as const, chromosome: "chr1", start: 0, end: 10000, value: 7 },
    ],
  };
  const features = {
    ...bigBedModule,
    fetch: async () => [{ chromosome: "chr1", start: 1100, end: 1200, name: "Feature A" }],
  };
  const store = createTrackStore({
    modules: [compositeModule, signal, features],
    tracks: [
      compositeModule.create({
        base: { id: "overlay", title: "Overlay", display: "overlay" },
        tracks: [
          signal.create({
            base: { id: "signal", title: "Signal" },
            config: { url: "YOUR_URL_HERE" },
          }),
          features.create({
            base: { id: "features", title: "Features" },
            config: { url: "YOUR_URL_HERE" },
          }),
        ],
      }),
    ],
  });
  const browser = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    trackWidth: 1000,
  });
  const bbox = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");
  const hitTest = Object.getOwnPropertyDescriptor(document, "elementsFromPoint");
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 150, height: 40 }),
  });
  const probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browser} trackStore={store} />,
  );
  try {
    const svg = document.querySelector("#browserSVG")!;
    const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
    Object.assign(svg, {
      createSVGPoint: () => point,
      getScreenCTM: () => ({ a: 1, b: 0, e: 0, f: 0, inverse: () => ({}) }),
    });
    const signalHit = [
      ...document.querySelectorAll<SVGRectElement>(
        '[data-track-plot="signal"] rect[pointer-events="all"]',
      ),
    ].at(-1)!;
    const featureHit = [
      ...document.querySelectorAll<SVGRectElement>('[data-track-plot="features"] rect'),
    ].find((rect) => rect.getAttribute("style")?.includes("cursor"))!;
    expect(signalHit).toBeDefined();
    expect(featureHit).toBeDefined();
    signalHit.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect;
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: () => [featureHit, signalHit],
    });
    await probe.measure(async () => {
      featureHit.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true, clientX: 40, clientY: 20 }),
      );
      await new Promise(requestAnimationFrame);
    });
    const entries = [...document.querySelectorAll("[data-tooltip-track]")];
    expect(entries.map((entry) => entry.getAttribute("data-tooltip-track"))).toEqual([
      "features",
      "signal",
    ]);
    expect(entries[0]?.textContent).toContain("Feature A");
    expect(entries[1]?.textContent).toBe("Signal7.00");
    // A gap between features leaves only the covered signal's value.
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: () => [signalHit],
    });
    await probe.measure(async () => {
      signalHit.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true, clientX: 45, clientY: 20 }),
      );
      await new Promise(requestAnimationFrame);
    });
    expect(
      [...document.querySelectorAll("[data-tooltip-track]")].map((entry) =>
        entry.getAttribute("data-tooltip-track"),
      ),
    ).toEqual(["signal"]);
  } finally {
    probe.unmount();
    if (bbox) Object.defineProperty(SVGElement.prototype, "getBBox", bbox);
    else Reflect.deleteProperty(SVGElement.prototype, "getBBox");
    if (hitTest) Object.defineProperty(document, "elementsFromPoint", hitTest);
    else Reflect.deleteProperty(document, "elementsFromPoint");
  }
});
