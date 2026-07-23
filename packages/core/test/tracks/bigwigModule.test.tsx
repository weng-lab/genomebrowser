import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createFetchSignature } from "../../src/modules/fetchOnChange";
import { bigWigModule } from "../../src/tracks/bigwig/module";

vi.mock("../../src/modules/interaction", () => ({ useInteraction: () => null }));
vi.mock("../../src/browser/tooltip/useTooltip", () => ({
  useTooltip: () => ({ hide: vi.fn(), show: vi.fn() }),
}));

const region = { chromosome: "chr1", start: 0, end: 1 };
const clampedData = [
  { chr: "chr1", start: 0, end: 1, value: -5 },
  { chr: "chr1", start: 0, end: 1, value: 5 },
];

describe("BigWig module", () => {
  it("parses clamp indicator defaults and explicit values", () => {
    const defaultTrack = createTrack();
    const configuredTrack = bigWigModule.create({
      id: "configured-signal",
      title: "Configured signal",
      config: {
        url: "YOUR_URL_HERE",
        showClampIndicators: false,
        clampIndicatorColor: "rebeccapurple",
      },
    });

    expect(defaultTrack.config.showClampIndicators).toBe(true);
    expect(defaultTrack.config.clampIndicatorColor).toBe("#ff0000");
    expect(configuredTrack.config.showClampIndicators).toBe(false);
    expect(configuredTrack.config.clampIndicatorColor).toBe("rebeccapurple");
  });

  it("excludes both clamp indicator options from the fetch signature", () => {
    const track = createTrack();
    const signature = createFetchSignature(bigWigModule, track);

    expect(signature).toBe(JSON.stringify({ url: "YOUR_URL_HERE" }));
    expect(
      createFetchSignature(bigWigModule, {
        ...track,
        config: {
          ...track.config,
          showClampIndicators: false,
          clampIndicatorColor: "#123456",
        },
      }),
    ).toBe(signature);
  });

  it("uses one configured color for both full-mode clamp boundaries", () => {
    const markup = renderFull({
      ...createTrack().config,
      yRange: { min: -1, max: 1 },
      clampIndicatorColor: "#123456",
    });

    expect(markup.match(/stroke="#123456"/g)).toHaveLength(2);
    expect(markup).toContain('d="M 0 0 l 0 2 "');
    expect(markup).toContain('d="M 0 80 l 0 -2 "');
  });

  it("hides both full-mode indicators without changing clipped signal geometry", () => {
    const markup = renderFull({
      ...createTrack().config,
      yRange: { min: -1, max: 1 },
      showClampIndicators: false,
    });

    expect(markup).not.toContain('stroke="#ff0000"');
    expect(markup).not.toContain('d="M 0 0 l 0 2 "');
    expect(markup).not.toContain('d="M 0 80 l 0 -2 "');
    expect(markup).toContain('d="M 0 40 L 0 40 L 0 80 L 1 80 L 1 40"');
    expect(markup).toContain('d="M 0 40 L 0 40 L 0 0 L 1 0 L 1 40"');
  });

  it("does not render clamp indicators in dense mode", () => {
    const DenseRenderer = bigWigModule.render.dense;
    const configuredMarkup = renderToStaticMarkup(
      <DenseRenderer
        id="signal"
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
      config={config}
      data={clampedData}
      region={region}
      width={1}
      height={80}
    />,
  );
}
