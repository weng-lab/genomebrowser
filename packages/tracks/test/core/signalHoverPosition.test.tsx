// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { BigWigValueRecord } from "@weng-lab/genomic-reader";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FullBigWig } from "../../src/bigwig/render";
import { methylCModule } from "../../src/methylc";
import { SplitMethylC } from "../../src/methylc/render";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mocks = vi.hoisted(() => ({ show: vi.fn() }));

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  useTooltip: () => ({ hide: vi.fn(), show: mocks.show }),
  useInteraction: () => undefined,
}));

// Four bases across 40 units: base 0 covers x [0, 10), base 1 covers [10, 20).
const region = { chromosome: "chr1", start: 0, end: 4 };
const width = 40;
const records: BigWigValueRecord[] = [1, 2, 3, 4].map((value, start) => ({
  kind: "value",
  chromosome: "chr1",
  start,
  end: start + 1,
  value,
}));
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mocks.show.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("reports the BigWig base under the pointer near its right edge", () => {
  hover(
    <FullBigWig
      id="signal"
      color="#000000"
      config={{
        url: "YOUR_URL_HERE",
        fillWithZero: false,
        showClampIndicators: true,
        clampIndicatorColor: "#ff0000",
      }}
      data={records}
      visibleRegion={region}
      region={region}
      width={width}
      height={40}
    />,
    9.6,
  );

  expect(mocks.show).toHaveBeenCalledWith(
    expect.objectContaining({ x: 9, max: 1 }),
    expect.anything(),
  );
});

it("reports the MethylC base under the pointer near its right edge", () => {
  const track = methylCModule.create({
    base: { id: "methylc", title: "MethylC" },
    config: { urls: urls("YOUR_URL_HERE") },
  });
  hover(
    <SplitMethylC
      {...track.base}
      config={track.config}
      data={[records, [], [], [], [], [], [], []]}
      visibleRegion={region}
      region={region}
      width={width}
      height={80}
    />,
    9.6,
  );

  expect(mocks.show.mock.calls[0]?.[0].tooltipValues[0]).toMatchObject({ x: 9, max: 1 });
});

function hover(element: ReactElement, clientX: number) {
  act(() => root.render(<svg>{element}</svg>));
  const overlay = container.querySelector<SVGRectElement>('rect[pointer-events="all"]');
  if (!overlay) throw new Error("Could not find the hover overlay");
  overlay.getBoundingClientRect = () => new DOMRect(0, 0, width, 40);
  act(() => overlay.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX })));
}

function urls(url: string) {
  const strand = { cpg: { url }, chg: { url }, chh: { url }, depth: { url } };
  return { plusStrand: strand, minusStrand: strand };
}
