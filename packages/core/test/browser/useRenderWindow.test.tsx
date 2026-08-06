// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import {
  createRenderWindowSignature,
  getRenderWindow,
  useRenderWindow,
} from "../../src/browser/viewport/useRenderWindow";
import type { AssemblyDefinition } from "../../src/genome/assembly";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let renderWindow: ReturnType<typeof useRenderWindow> | undefined;
const assembly: AssemblyDefinition = { id: "test", chromosomes: { chr1: 2_000 } };

function Harness(props: Parameters<typeof useRenderWindow>[0]) {
  renderWindow = useRenderWindow(props);
  return null;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  renderWindow = undefined;
  root = undefined;
});

describe("render window", () => {
  it("computes the overscanned target region and render width", () => {
    const renderWindow = getRenderWindow(
      { chromosome: "chr1", start: 100, end: 200 },
      assembly,
      250,
      3,
    );

    expect(renderWindow).toEqual({
      targetRenderRegion: {
        chromosome: "chr1",
        start: 0,
        end: 300,
      },
      renderWidth: 750,
      renderStartOffset: 250,
    });
  });

  it.each([
    [
      "lower",
      { chromosome: "chr1", start: 0, end: 100 },
      { chromosome: "chr1", start: 0, end: 200 },
      0,
    ],
    [
      "upper",
      { chromosome: "chr1", start: 1_900, end: 2_000 },
      { chromosome: "chr1", start: 1_800, end: 2_000 },
      250,
    ],
  ] as const)(
    "bounds the %s overscan window without changing its visible scale",
    (_edge, region, target, offset) => {
      expect(getRenderWindow(region, assembly, 250, 3)).toEqual({
        targetRenderRegion: target,
        renderWidth: 500,
        renderStartOffset: offset,
      });
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not create a render window from invalid track width %s",
    (trackWidth) => {
      const renderWindow = getRenderWindow(
        { chromosome: "chr1", start: 100, end: 200 },
        assembly,
        trackWidth,
        3,
      );

      expect(renderWindow).toBeNull();
    },
  );

  it("matches the width-independent data signature", () => {
    const region = { chromosome: "chr1", start: 0, end: 300 };
    const trackIds = ["signal"];

    expect(createRenderWindowSignature(region, trackIds)).toBe(
      JSON.stringify({ region, trackIds: JSON.stringify(["signal"]) }),
    );
  });

  it("changes settlement keys for membership but not equivalent ID snapshots", async () => {
    const region = { chromosome: "chr1", start: 0, end: 100 };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness
          assembly={assembly}
          region={region}
          trackIds={["signal"]}
          trackWidth={250}
          overscanMultiplier={3}
        />,
      ),
    );
    const initialKey = renderWindow?.dataKey;

    await act(async () =>
      root?.render(
        <Harness
          assembly={assembly}
          region={region}
          trackIds={["signal"]}
          trackWidth={250}
          overscanMultiplier={3}
        />,
      ),
    );
    expect(renderWindow?.dataKey).toBe(initialKey);
    expect(renderWindow?.isDataSettled).toBe(true);

    await act(async () =>
      root?.render(
        <Harness
          assembly={assembly}
          region={region}
          trackIds={["signal", "genes"]}
          trackWidth={250}
          overscanMultiplier={3}
        />,
      ),
    );
    expect(renderWindow?.dataKey).not.toBe(initialKey);
    expect(renderWindow?.isDataSettled).toBe(false);
  });

  it("settles only data for the current committed render window", async () => {
    const initialRegion = { chromosome: "chr1", start: 0, end: 100 };
    const nextRegion = { chromosome: "chr1", start: 1_000, end: 1_200 };
    const initialTarget = { chromosome: "chr1", start: 0, end: 200 };
    const nextTarget = { chromosome: "chr1", start: 800, end: 1_400 };
    const trackIds: Parameters<typeof useRenderWindow>[0]["trackIds"] = [];

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness
          assembly={assembly}
          region={initialRegion}
          trackIds={trackIds}
          trackWidth={250}
          overscanMultiplier={3}
        />,
      ),
    );

    const initialDataKey = renderWindow?.dataKey;
    expect(renderWindow?.targetRenderRegion).toEqual(initialTarget);
    expect(renderWindow?.displayedRenderRegion).toEqual(initialTarget);
    expect(renderWindow?.renderWidth).toBe(500);
    expect(renderWindow?.renderStartOffset).toBe(0);

    await act(async () =>
      root?.render(
        <Harness
          assembly={assembly}
          region={nextRegion}
          trackIds={trackIds}
          trackWidth={250}
          overscanMultiplier={3}
        />,
      ),
    );

    const nextDataKey = renderWindow?.dataKey;
    expect(nextDataKey).not.toBe(initialDataKey);
    expect(renderWindow?.targetRenderRegion).toEqual(nextTarget);
    expect(renderWindow?.displayedRenderRegion).toEqual(initialTarget);
    expect(renderWindow?.renderWidth).toBe(250);
    expect(renderWindow?.renderStartOffset).toBe(1_250);

    expect(renderWindow?.settleData(initialDataKey!)).toBe(false);
    expect(renderWindow?.displayedRenderRegion).toEqual(initialTarget);

    await act(async () => expect(renderWindow?.settleData(nextDataKey!)).toBe(true));
    expect(renderWindow?.displayedRenderRegion).toEqual(nextTarget);
    expect(renderWindow?.renderWidth).toBe(750);
    expect(renderWindow?.renderStartOffset).toBe(250);
  });

  it("derives width-only geometry synchronously without settling data", async () => {
    const region = { chromosome: "chr1", start: 100, end: 200 };
    const trackIds: Parameters<typeof useRenderWindow>[0]["trackIds"] = [];

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <Harness
          assembly={assembly}
          region={region}
          trackIds={trackIds}
          trackWidth={250}
          overscanMultiplier={3}
        />,
      ),
    );
    const dataKey = renderWindow?.dataKey;

    await act(async () =>
      root?.render(
        <Harness
          assembly={assembly}
          region={region}
          trackIds={trackIds}
          trackWidth={500}
          overscanMultiplier={3}
        />,
      ),
    );

    expect(renderWindow?.dataKey).toBe(dataKey);
    expect(renderWindow?.displayedRenderRegion).toEqual({ chromosome: "chr1", start: 0, end: 300 });
    expect(renderWindow?.renderWidth).toBe(1_500);
    expect(renderWindow?.renderStartOffset).toBe(500);
  });

  it("aligns old displayed data to a clamped visible region before settlement", async () => {
    const initialRegion = { chromosome: "chr1", start: 0, end: 100 };
    const clampedRegion = { chromosome: "chr1", start: 0, end: 80 };
    const trackIds: Parameters<typeof useRenderWindow>[0]["trackIds"] = [];

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <Harness
          assembly={assembly}
          region={initialRegion}
          trackIds={trackIds}
          trackWidth={100}
          overscanMultiplier={3}
        />,
      ),
    );

    await act(async () =>
      root?.render(
        <Harness
          assembly={assembly}
          region={clampedRegion}
          trackIds={trackIds}
          trackWidth={100}
          overscanMultiplier={3}
        />,
      ),
    );

    expect(renderWindow?.targetRenderRegion).toEqual({ chromosome: "chr1", start: 0, end: 160 });
    expect(renderWindow?.displayedRenderRegion).toEqual({ chromosome: "chr1", start: 0, end: 200 });
    expect(renderWindow?.renderWidth).toBe(250);
    expect(renderWindow?.renderStartOffset).toBe(0);
  });
});
