import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PackTranscript } from "../../src/transcript/render";
import type { TranscriptData } from "../../src/transcript/types";

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  useAutoTrackHeight: () => 12,
  useInteraction: () => null,
  useTooltip: () => ({ hide: vi.fn(), show: vi.fn() }),
}));

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
  });
});
