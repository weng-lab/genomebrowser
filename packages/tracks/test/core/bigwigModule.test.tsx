import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { resolveBigWigRange } from "../../src/bigwig/helpers";
import { bigWigModule } from "../../src/bigwig";

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  useInteraction: () => null,
  useTooltip: () => ({ hide: vi.fn(), show: vi.fn() }),
}));

const region = { chromosome: "chr1", start: 0, end: 1 };
const clampedData = [
  { kind: "value" as const, chromosome: "chr1", start: 0, end: 1, value: -5 },
  { kind: "value" as const, chromosome: "chr1", start: 0, end: 1, value: 5 },
];

describe("BigWig module", () => {
  it.each([
    ["no bounds", {}],
    ["only a minimum", { min: -1 }],
    ["only a maximum", { max: 1 }],
    ["both valid bounds", { min: -1, max: 1 }],
  ])("accepts yRange with %s", (_label, yRange) => {
    const track = bigWigModule.create({
      id: "configured-signal",
      title: "Configured signal",
      config: { url: "YOUR_URL_HERE", yRange },
    });

    expect(track.config.yRange).toEqual(yRange);
  });

  it.each([
    { min: 1, max: 1 },
    { min: 2, max: 1 },
  ])("rejects an explicitly invalid yRange pair: %j", (yRange) => {
    expect(() =>
      bigWigModule.create({
        id: "configured-signal",
        title: "Configured signal",
        config: { url: "YOUR_URL_HERE", yRange },
      }),
    ).toThrow(/min must be less than max/);
  });

  it.each([
    [undefined, { min: -5, max: 5 }],
    [{ min: -1 }, { min: -1, max: 5 }],
    [{ max: 1 }, { min: -5, max: 1 }],
    [
      { min: -1, max: 1 },
      { min: -1, max: 1 },
    ],
  ] as const)("resolves the automatic range with override %j", (override, expected) => {
    expect(resolveBigWigRange({ min: -5, max: 5 }, override)).toEqual(expected);
  });

  it.each([{ min: 5 }, { max: -5 }, { min: 1, max: 1 }, { min: 2, max: 1 }])(
    "falls back entirely to the automatic range when override %j resolves invalidly",
    (override) => {
      expect(resolveBigWigRange({ min: -5, max: 5 }, override)).toEqual({
        min: -5,
        max: 5,
      });
    },
  );

  it("uses the automatic range when a partial override resolves invalidly during rendering", () => {
    expect(renderFull({ ...createTrack().config, yRange: { min: 5 } })).toBe(
      renderFull(createTrack().config),
    );
  });

  it("parses clamp indicator defaults and explicit hexadecimal values", () => {
    const defaultTrack = createTrack();
    const configuredTrack = bigWigModule.create({
      id: "configured-signal",
      title: "Configured signal",
      config: {
        url: "YOUR_URL_HERE",
        showClampIndicators: false,
        clampIndicatorColor: "#663399",
      },
    });

    expect(defaultTrack.config.showClampIndicators).toBe(true);
    expect(defaultTrack.config.clampIndicatorColor).toBe("#ff0000");
    expect(configuredTrack.config.showClampIndicators).toBe(false);
    expect(configuredTrack.config.clampIndicatorColor).toBe("#663399");
    expect(() =>
      bigWigModule.create({
        id: "invalid-color",
        title: "Invalid color",
        config: { url: "YOUR_URL_HERE", clampIndicatorColor: "rebeccapurple" },
      }),
    ).toThrow(/six-digit hexadecimal color/);
  });

  it("aligns both full-mode clamp boundaries with the one-unit signal column", () => {
    const markup = renderFull({
      ...createTrack().config,
      yRange: { min: -1, max: 1 },
      clampIndicatorColor: "#123456",
    });

    expect(markup.match(/stroke="#123456"/g)).toHaveLength(2);
    expect(markup).toContain(
      '<path d="M 0.5 0 l 0 2 " stroke="#123456" stroke-width="1" fill="none"></path>',
    );
    expect(markup).toContain(
      '<path d="M 0.5 80 l 0 -2 " stroke="#123456" stroke-width="1" fill="none"></path>',
    );
    expect(markup).toContain('d="M 0 40 L 0 40 L 0 80 L 1 80 L 1 40"');
    expect(markup).toContain('d="M 0 40 L 0 40 L 0 0 L 1 0 L 1 40"');
  });

  it("hides both full-mode indicators without changing clipped signal geometry", () => {
    const markup = renderFull({
      ...createTrack().config,
      yRange: { min: -1, max: 1 },
      showClampIndicators: false,
    });

    expect(markup).not.toContain('stroke="#ff0000"');
    expect(markup).not.toContain('d="M 0.5 0 l 0 2 "');
    expect(markup).not.toContain('d="M 0.5 80 l 0 -2 "');
    expect(markup).toContain('d="M 0 40 L 0 40 L 0 80 L 1 80 L 1 40"');
    expect(markup).toContain('d="M 0 40 L 0 40 L 0 0 L 1 0 L 1 40"');
  });

  it("does not render clamp indicators in dense mode", () => {
    const DenseRenderer = bigWigModule.render.dense;
    const configuredMarkup = renderToStaticMarkup(
      <DenseRenderer
        id="signal"
        color="#2266aa"
        config={{
          ...createTrack().config,
          yRange: { min: -1, max: 1 },
          clampIndicatorColor: "#123456",
        }}
        data={clampedData}
        region={region}
        width={1}
        height={80}
      />,
    );
    const hiddenMarkup = renderToStaticMarkup(
      <DenseRenderer
        id="signal"
        color="#2266aa"
        config={{
          ...createTrack().config,
          yRange: { min: -1, max: 1 },
          showClampIndicators: false,
        }}
        data={clampedData}
        region={region}
        width={1}
        height={80}
      />,
    );

    expect(configuredMarkup).toBe(hiddenMarkup);
    expect(configuredMarkup).not.toContain('stroke="#123456"');
    expect(configuredMarkup).not.toContain("<path");
  });
});

function createTrack() {
  return bigWigModule.create({
    id: "signal",
    title: "Signal",
    config: { url: "YOUR_URL_HERE" },
  });
}

function renderFull(config: ReturnType<typeof createTrack>["config"]) {
  const FullRenderer = bigWigModule.render.full;
  return renderToStaticMarkup(
    <FullRenderer
      id="signal"
      color="#2266aa"
      config={config}
      data={clampedData}
      region={region}
      width={1}
      height={80}
    />,
  );
}
