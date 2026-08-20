import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PackTranscript } from "../../src/transcript/render";
import type { TranscriptData } from "../../src/transcript/types";

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

beforeEach(() => layout.useRowLayout.mockClear());

describe("Transcript rendering", () => {
  it("uses canonical and highlight config colors directly", () => {
    const data: TranscriptData = [
      {
        strand: "+",
        transcripts: [
          {
            id: "canonical",
            name: "Canonical",
            coordinates: { start: 10, end: 20 },
            strand: "+",
            tag: "MANE_Select",
          },
          {
            id: "highlighted",
            name: "Target gene",
            coordinates: { start: 40, end: 50 },
            strand: "+",
          },
        ],
      },
    ];

    const markup = renderToStaticMarkup(
      <PackTranscript
        id="genes"
        color="#abcdef"
        config={{
          endpoint: "YOUR_URL_HERE",
          assembly: "GRCh38",
          version: 47,
          geneName: "target",
          canonicalColor: "#112233",
          highlightColor: "#445566",
          rowHeight: 12,
        }}
        data={data}
        region={{ chromosome: "chr1", start: 0, end: 100 }}
        width={100}
        height={24}
      />,
    );

    expect(markup).toContain('fill="#112233"');
    expect(markup).toContain('fill="#445566"');
    expect(markup).not.toContain('fill="#abcdef"');
    expect(layout.useRowLayout).toHaveBeenCalledWith(
      "genes",
      2,
      expect.objectContaining({ rowHeight: 12 }),
    );
  });

  it("scales labels and strokes to fit the one-pixel row slot", () => {
    const data: TranscriptData = [
      {
        strand: "+",
        transcripts: [
          {
            id: "small",
            name: "Small",
            coordinates: { start: 10, end: 20 },
            strand: "+",
          },
        ],
      },
    ];

    const markup = renderToStaticMarkup(
      <PackTranscript
        id="genes"
        color="#abcdef"
        config={{
          endpoint: "YOUR_URL_HERE",
          assembly: "GRCh38",
          version: 47,
          canonicalColor: "#112233",
          highlightColor: "#445566",
          rowHeight: 1,
        }}
        data={data}
        region={{ chromosome: "chr1", start: 0, end: 100 }}
        width={100}
        height={24}
      />,
    );

    expect(markup).toContain('font-size="1"');
    expect(markup).toContain('stroke-width="0.4"');
    expect(markup).toContain('height="1"');
  });
});
