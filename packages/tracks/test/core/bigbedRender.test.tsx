import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const layout = vi.hoisted(() => ({
  useRowLayout: vi.fn(
    (_trackId: string, rowCount = 0, config: { rowHeight: number } = { rowHeight: 1 }) => ({
      rowHeight: config.rowHeight,
      trackHeight: Math.max(1, rowCount) * config.rowHeight,
    }),
  ),
}));

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  useInteraction: () => null,
  useTooltip: () => ({ hide: vi.fn(), show: vi.fn() }),
}));

vi.mock("../../src/shared/layout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/shared/layout")>()),
  useRowLayout: layout.useRowLayout,
}));

import { DenseBigBed, SquishBigBed } from "../../src/bigbed/render";
import type { BigBedRow } from "../../src/bigbed/types";

const config = { url: "YOUR_URL_HERE", rowHeight: 7 };
const data: BigBedRow[] = [
  { chromosome: "chr1", start: 0, end: 20, fields: [] },
  { chromosome: "chr1", start: 10, end: 30, fields: [] },
];
const commonProps = {
  id: "peaks",
  color: "#4b9560",
  config,
  data,
  region: { chromosome: "chr1", start: 0, end: 100 },
  width: 100,
  height: 99,
};

beforeEach(() => layout.useRowLayout.mockClear());

describe("BigBed row-layout wiring", () => {
  it("uses one configured row for dense and packed row count for squish", () => {
    const denseMarkup = renderToStaticMarkup(<DenseBigBed {...commonProps} />);
    const squishMarkup = renderToStaticMarkup(<SquishBigBed {...commonProps} />);

    expect(layout.useRowLayout).toHaveBeenNthCalledWith(1, "peaks", 1, config);
    expect(layout.useRowLayout).toHaveBeenNthCalledWith(2, "peaks", 2, config);
    expect(denseMarkup).toContain('height="7"');
    expect(denseMarkup).toContain('height="4.2"');
    expect(squishMarkup).toContain('height="14"');
    expect(squishMarkup).toContain('transform="translate(0,7)"');
  });
});
