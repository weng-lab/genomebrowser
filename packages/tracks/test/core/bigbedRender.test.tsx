// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { bigBedModule, type BigBedRow } from "@weng-lab/genomebrowser-tracks/bigbed";
import { mountTrack } from "../mountTrack";

const config = { url: "YOUR_URL_HERE", rowHeight: 7 };
const data: BigBedRow[] = [
  { chromosome: "chr1", start: 0, end: 20, fields: [] },
  { chromosome: "chr1", start: 10, end: 30, fields: [] },
];
const region = { chromosome: "chr1", start: 0, end: 100 };

async function mount(display: "dense" | "squish", rows = data, visibleRegion = region) {
  return mountTrack({
    module: bigBedModule,
    track: { base: { id: "peaks", title: "Peaks", height: 99, display }, config },
    data: rows,
    region,
    visibleRegion,
    width: 100,
  });
}

describe("BigBed row layout", () => {
  it("uses one configured row for dense and packed row count for squish", async () => {
    const dense = await mount("dense");
    const squish = await mount("squish");

    expect(dense.height).toBe(7);
    expect(squish.height).toBe(14);
    expect(dense.content.innerHTML).toContain('height="7"');
    expect(dense.content.innerHTML).toContain('height="4.2"');
    expect(squish.content.innerHTML).toContain('height="14"');
    expect(squish.content.innerHTML).toContain('transform="translate(0,7)"');
  });

  it("counts only visible squish rows while rendering overscan rows", async () => {
    const view = await mount(
      "squish",
      [
        { chromosome: "chr1", start: 10, end: 30, fields: [] },
        { chromosome: "chr1", start: 10, end: 30, fields: [] },
        { chromosome: "chr1", start: 70, end: 80, fields: [] },
      ],
      { chromosome: "chr1", start: 60, end: 90 },
    );

    expect(view.height).toBe(7);
    expect(view.content.innerHTML).toContain('transform="translate(0,7)"');
  });
});
