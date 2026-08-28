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

import { FullBulkBed } from "../../src/bulkbed/render";
import type { BulkBedConfig, BulkBedData } from "../../src/bulkbed/types";

const data: BulkBedData = [
  [{ chromosome: "chr1", start: 0, end: 20, fields: [], datasetName: "Dataset A" }],
  [{ chromosome: "chr1", start: 30, end: 50, fields: [], datasetName: "Dataset B" }],
];
const fullRegion = { chromosome: "chr1", start: 0, end: 100 };

beforeEach(() => layout.useRowLayout.mockClear());

describe("BulkBed row rendering", () => {
  it("passes dataset count and configured row height to the shared layout hook", () => {
    const config = bulkBedConfig({ rowHeight: 10, gap: 3 });
    const markup = render(config);

    expect(layout.useRowLayout).toHaveBeenCalledWith("bulk-peaks", 2, config);
    expect(markup).toContain('height="20"');
    expect(markup).toContain('height="7"');
    expect(markup).toContain('transform="translate(0,0)"');
    expect(markup).toContain('transform="translate(0,10)"');
  });

  it("keeps content height non-negative when gap exceeds a small row slot", () => {
    const markup = render(bulkBedConfig({ rowHeight: 1, gap: 2 }));

    expect(markup).toContain('height="2"');
    expect(markup).toContain('height="0"');
    expect(markup).toContain('transform="translate(0,1)"');
  });

  it("counts datasets with visible features while rendering overscan datasets", () => {
    const config = bulkBedConfig({ rowHeight: 10, gap: 3 });
    const markup = render(config, { chromosome: "chr1", start: 25, end: 60 });

    expect(layout.useRowLayout).toHaveBeenCalledWith("bulk-peaks", 1, config);
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

function render(config: BulkBedConfig, visibleRegion = fullRegion) {
  return renderToStaticMarkup(
    <FullBulkBed
      id="bulk-peaks"
      color="#4b9560"
      config={config}
      data={data}
      visibleRegion={visibleRegion}
      region={{ chromosome: "chr1", start: 0, end: 100 }}
      width={100}
      height={80}
    />,
  );
}
