// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  bulkBedModule,
  type BulkBedConfig,
  type BulkBedData,
} from "@weng-lab/genomebrowser-tracks/bulkbed";
import { mountTrack } from "../mountTrack";

const data: BulkBedData = [
  [{ chromosome: "chr1", start: 0, end: 20, fields: [], datasetName: "Dataset A" }],
  [{ chromosome: "chr1", start: 30, end: 50, fields: [], datasetName: "Dataset B" }],
];
const fullRegion = { chromosome: "chr1", start: 0, end: 100 };

describe("BulkBed row rendering", () => {
  it("gives each dataset one configured row", async () => {
    const view = await render(bulkBedConfig({ rowHeight: 10, gap: 3 }));
    const markup = view.content.innerHTML;

    expect(view.height).toBe(20);
    expect(markup).toContain('height="20"');
    expect(markup).toContain('height="7"');
    expect(markup).toContain('transform="translate(0,0)"');
    expect(markup).toContain('transform="translate(0,10)"');
  });

  it("renders each interval color and uses the track color for uncolored intervals", async () => {
    const rows = [
      [
        { chromosome: "chr1", start: 0, end: 10, fields: [], color: "rgb(255,0,0)" },
        { chromosome: "chr1", start: 10, end: 20, fields: [], color: "rgb(0,255,0)" },
        { chromosome: "chr1", start: 20, end: 30, fields: [] },
      ],
    ];
    const view = await render(bulkBedConfig({ rowHeight: 10, gap: 2 }), fullRegion, rows);
    const markup = view.content.innerHTML;
    expect(markup).toContain('fill="rgb(255,0,0)"');
    expect(markup).toContain('fill="rgb(0,255,0)"');
    expect(markup).toContain('fill="#4b9560"');
  });

  it("keeps content height non-negative when gap exceeds a small row slot", async () => {
    const markup = (await render(bulkBedConfig({ rowHeight: 1, gap: 2 }))).content.innerHTML;

    expect(markup).toContain('height="2"');
    expect(markup).toContain('height="0"');
    expect(markup).toContain('transform="translate(0,1)"');
  });

  it("counts datasets with visible features while rendering overscan datasets", async () => {
    const view = await render(bulkBedConfig({ rowHeight: 10, gap: 3 }), {
      chromosome: "chr1",
      start: 25,
      end: 60,
    });
    const markup = view.content.innerHTML;

    expect(view.height).toBe(10);
    expect(markup).toContain('height="10"');
    expect(markup).toContain('transform="translate(0,10)"');
  });
});

function bulkBedConfig(options: { rowHeight: number; gap: number }): BulkBedConfig {
  return {
    datasets: [
      { name: "Dataset A", url: "YOUR_URL_HERE" },
      { name: "Dataset B", url: "YOUR_URL_HERE" },
    ],
    ...options,
  };
}

async function render(config: BulkBedConfig, visibleRegion = fullRegion, rows = data) {
  return mountTrack({
    module: bulkBedModule,
    track: {
      base: { id: "bulk-peaks", title: "Bulk peaks", color: "#4b9560", height: 80 },
      config,
    },
    data: rows,
    region: { chromosome: "chr1", start: 0, end: 100 },
    visibleRegion,
    width: 100,
  });
}
