import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FullBigWig, DenseBigWig } from "../../src/bigwig/render";
import { bigWigModule } from "../../src/bigwig";
import { ValueLabels } from "../../src/shared/ValueLabels";

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  TrackLabel: ({ children, y }: { children: string; y: number }) => <text y={y}>{children}</text>,
  useInteraction: () => null,
  useTooltip: () => ({ hide: vi.fn(), show: vi.fn() }),
}));

const region = { chromosome: "chr1", start: 0, end: 300 };
const props = {
  id: "signal",
  color: "#2266aa",
  height: 100,
  region,
  visibleRegion: { ...region, start: 100, end: 200 },
  width: 900,
  config: bigWigModule.create({
    base: {
      id: "signal",
      title: "Signal",
    },
    config: { url: "YOUR_URL_HERE", yRange: { min: -2 } },
  }).config,
  data: [
    { kind: "value" as const, ...region, start: 0, end: 100, value: 1000 },
    { kind: "value" as const, ...region, start: 100, end: 200, value: 5 },
  ],
};

describe("renderer value labels", () => {
  it("labels the effective viewport range rather than overscanned data", () => {
    const markup = renderToStaticMarkup(<FullBigWig {...props} />);
    expect(markup).toMatch(/>5<\/text>/);
    expect(markup).toMatch(/>-2<\/text>/);
    expect(markup).toMatch(/>0<\/text>/);
    expect(markup).not.toMatch(/>1000<\/text>/);
  });

  it("omits vertical labels for an intensity display", () => {
    expect(renderToStaticMarkup(<DenseBigWig {...props} />)).not.toContain("<text");
  });

  it("keeps endpoint labels inside short tracks and suppresses colliding middle labels", () => {
    const markup = renderToStaticMarkup(
      <ValueLabels
        height={35}
        ticks={[
          { value: 1, y: 0 },
          { value: 0, y: 35 },
          { value: 0.5, y: 17.5 },
        ]}
      />,
    );
    expect(markup.match(/<text/g)).toHaveLength(2);
    expect(markup).toContain('y="35"');
    expect(markup).not.toMatch(/>0.5<\/text>/);
    expect(renderToStaticMarkup(<ValueLabels height={10} ticks={[{ value: 1, y: 0 }]} />)).toBe("");
  });
});
