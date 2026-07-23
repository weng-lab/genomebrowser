import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createFetchSignature } from "../../src/modules/fetchOnChange";
import { caveModule } from "../../src/tracks/cave/module";

vi.mock("../../src/modules/interaction", () => ({ useInteraction: () => null }));
vi.mock("../../src/browser/tooltip/useTooltip", () => ({
  useTooltip: () => ({ hide: vi.fn(), show: vi.fn() }),
}));

const region = { chromosome: "chr1", start: 0, end: 1 };
const data = {
  top: [{ chr: "chr1", start: 0, end: 1, value: 0.5 }],
  bottom: [{ chr: "chr1", start: 0, end: 1, value: 0.5 }],
};

describe("CAVE module", () => {
  it("accepts optional top and bottom colors without adding defaults to config", () => {
    const defaultTrack = createTrack();
    const configuredTrack = createTrack({ topColor: "#123456", bottomColor: "#654321" });

    expect(defaultTrack.config).not.toHaveProperty("topColor");
    expect(defaultTrack.config).not.toHaveProperty("bottomColor");
    expect(configuredTrack.config).toMatchObject({
      topColor: "#123456",
      bottomColor: "#654321",
    });
    expect(caveModule.settingsComponent).toBeTypeOf("function");
  });

  it("excludes both colors from the fetch signature", () => {
    const track = createTrack();
    const signature = createFetchSignature(caveModule, track);

    expect(signature).toBe(JSON.stringify({ neurotransmitter: "GABA", age: "Adulthood" }));
    expect(
      createFetchSignature(caveModule, {
        ...track,
        config: { ...track.config, topColor: "#123456", bottomColor: "#654321" },
      }),
    ).toBe(signature);
  });

  it("preserves the track color fallback and supports independent overrides", () => {
    const fallbackMarkup = renderFull(createTrack().config, "#123456");
    const bottomOnlyMarkup = renderFull(createTrack({ bottomColor: "#654321" }).config, "#123456");
    const configuredMarkup = renderFull(
      createTrack({ topColor: "rebeccapurple", bottomColor: "tomato" }).config,
      "#123456",
    );

    expect(fallbackMarkup).toContain('fill="#b8dafc"');
    expect(fallbackMarkup).toContain('fill="#123456"');
    expect(bottomOnlyMarkup).toContain('fill="#ffe9c7"');
    expect(bottomOnlyMarkup).toContain('fill="#654321"');
    expect(configuredMarkup).toContain('fill="rebeccapurple"');
    expect(configuredMarkup).toContain('fill="tomato"');
  });
});

function createTrack(colors: { topColor?: string; bottomColor?: string } = {}) {
  return caveModule.create({
    id: "cave",
    title: "CAVE",
    config: { neurotransmitter: "GABA", age: "Adulthood", ...colors },
  });
}

function renderFull(config: ReturnType<typeof createTrack>["config"], color: string) {
  const FullRenderer = caveModule.render.full;
  return renderToStaticMarkup(
    <FullRenderer
      id="cave"
      config={config}
      color={color}
      data={data}
      region={region}
      width={1}
      height={35}
    />,
  );
}
