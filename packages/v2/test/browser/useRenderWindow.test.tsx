// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import {
  createRenderWindowSignature,
  getRenderWindow,
  useRenderWindow,
} from "../../src/browser/viewport/useRenderWindow";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let renderWindow: ReturnType<typeof useRenderWindow> | undefined;

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
    expect(getRenderWindow({ chromosome: "chr1", start: 100, end: 200 }, 250, 3)).toEqual({
      targetRenderRegion: {
        chromosome: "chr1",
        start: 0,
        end: 300,
      },
      renderWidth: 750,
    });
  });

  it("matches the width-independent data signature", () => {
    const region = { chromosome: "chr1", start: 0, end: 300 };
    const tracks = [
      {
        type: "bigwig",
        base: {
          id: "signal",
          title: "Signal",
          display: "full",
          height: 80,
        },
        config: {},
      },
    ];

    expect(createRenderWindowSignature(region, tracks)).toBe(
      JSON.stringify({ region, trackIds: JSON.stringify(["signal"]) }),
    );
  });

  it("settles only data for the current committed render window", async () => {
    const initialRegion = { chromosome: "chr1", start: 100, end: 200 };
    const nextRegion = { chromosome: "chr1", start: 1_000, end: 1_200 };
    const initialTarget = { chromosome: "chr1", start: 0, end: 300 };
    const nextTarget = { chromosome: "chr1", start: 800, end: 1_400 };
    const tracks: Parameters<typeof useRenderWindow>[0]["tracks"] = [];

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness region={initialRegion} tracks={tracks} trackWidth={250} overscanMultiplier={3} />,
      ),
    );

    const initialDataKey = renderWindow?.dataKey;
    expect(renderWindow?.targetRenderRegion).toEqual(initialTarget);
    expect(renderWindow?.displayedRenderRegion).toEqual(initialTarget);

    await act(async () =>
      root?.render(
        <Harness region={nextRegion} tracks={tracks} trackWidth={250} overscanMultiplier={3} />,
      ),
    );

    const nextDataKey = renderWindow?.dataKey;
    expect(nextDataKey).not.toBe(initialDataKey);
    expect(renderWindow?.targetRenderRegion).toEqual(nextTarget);
    expect(renderWindow?.displayedRenderRegion).toEqual(initialTarget);

    expect(renderWindow?.settleData(initialDataKey!)).toBe(false);
    expect(renderWindow?.displayedRenderRegion).toEqual(initialTarget);

    await act(async () => expect(renderWindow?.settleData(nextDataKey!)).toBe(true));
    expect(renderWindow?.displayedRenderRegion).toEqual(nextTarget);
  });
});
