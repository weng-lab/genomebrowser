// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FullBigWig } from "../../src/bigwig/render";
import { FullCave } from "../../src/cave/render";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mocks = vi.hoisted(() => ({
  hide: vi.fn(),
  onHover: vi.fn(),
  onLeave: vi.fn(),
  show: vi.fn(),
}));

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  useTooltip: () => ({ hide: mocks.hide, show: mocks.show }),
  useInteraction: () => ({ onHover: mocks.onHover, onLeave: mocks.onLeave }),
}));

const region = { chromosome: "chr1", start: 0, end: 100 };
let container: HTMLDivElement | undefined;
let root: Root | undefined;

beforeEach(() => {
  mocks.hide.mockReset();
  mocks.onHover.mockReset();
  mocks.onLeave.mockReset();
  mocks.show.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("signal renderer no-data hover", () => {
  it("shows a BigWig tooltip for an actual empty rendered pixel without firing data callbacks", () => {
    act(() => {
      root?.render(
        <svg>
          <FullBigWig
            id="signal"
            color="#000000"
            config={{
              url: "YOUR_URL_HERE",
              fillWithZero: false,
              showClampIndicators: true,
              clampIndicatorColor: "#ff0000",
            }}
            data={[]}
            visibleRegion={region}
            region={region}
            width={4}
            height={40}
          />
        </svg>,
      );
    });

    hoverOverlay();

    expect(mocks.show).toHaveBeenCalledWith(
      { x: 1, min: null, max: null },
      expect.objectContaining({ clientX: 1 }),
    );
    expect(mocks.onHover).not.toHaveBeenCalled();
  });

  it("shows a CAVE tooltip with both actual empty channel pixels without firing data callbacks", () => {
    act(() => {
      root?.render(
        <svg>
          <FullCave
            id="cave"
            color="#000000"
            config={{
              neurotransmitter: "GABA",
              age: "Adulthood",
              topColor: "#000000",
              bottomColor: "#000000",
            }}
            data={{ top: [], bottom: [] }}
            visibleRegion={region}
            region={region}
            width={4}
            height={40}
          />
        </svg>,
      );
    });

    hoverOverlay();

    expect(mocks.show).toHaveBeenCalledWith(
      {
        x: 1,
        top: { x: 1, min: null, max: null },
        bottom: { x: 1, min: null, max: null },
      },
      expect.objectContaining({ clientX: 1 }),
    );
    expect(mocks.onHover).not.toHaveBeenCalled();
  });
});

function hoverOverlay() {
  const overlay = container?.querySelector<SVGRectElement>('rect[pointer-events="all"]');
  if (!overlay) throw new Error("Could not find the hover overlay");
  overlay.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 4,
      height: 40,
      right: 4,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON() {},
    }) as DOMRect;

  act(() => overlay.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 1 })));
}
