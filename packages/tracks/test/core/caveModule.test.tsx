import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { caveModule } from "../../src/cave";

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  useInteraction: () => null,
  useTooltip: () => ({ hide: vi.fn(), show: vi.fn() }),
}));

const region = { chromosome: "chr1", start: 0, end: 1 };
const data = {
  top: [{ kind: "value" as const, chromosome: "chr1", start: 0, end: 1, value: 0.5 }],
  bottom: [{ kind: "value" as const, chromosome: "chr1", start: 0, end: 1, value: 0.5 }],
};

describe("CAVE module", () => {
  it("parses concrete top and bottom color defaults", () => {
    const defaultTrack = createTrack();
    const configuredTrack = createTrack({ topColor: "#123456", bottomColor: "#654321" });

    expect(defaultTrack.config).toMatchObject({ topColor: "#000000", bottomColor: "#000000" });
    expect(configuredTrack.config).toMatchObject({
      topColor: "#123456",
      bottomColor: "#654321",
    });
    expect(caveModule.settingsComponent).toBeTypeOf("function");
  });

  it("renders concrete config colors directly", () => {
    const defaultMarkup = renderFull(createTrack().config, "#123456");
    const bottomOnlyMarkup = renderFull(createTrack({ bottomColor: "#654321" }).config, "#123456");
    const configuredMarkup = renderFull(
      createTrack({ topColor: "#112233", bottomColor: "#445566" }).config,
      "#123456",
    );

    expect(defaultMarkup.match(/fill="#000000"/g)).toHaveLength(2);
    expect(defaultMarkup).not.toContain('fill="#123456"');
    expect(bottomOnlyMarkup).toContain('fill="#000000"');
    expect(bottomOnlyMarkup).toContain('fill="#654321"');
    expect(configuredMarkup).toContain('fill="#112233"');
    expect(configuredMarkup).toContain('fill="#445566"');
  });

  it("does not alter configured colors with opacity", () => {
    const markup = renderFull(
      createTrack({ topColor: "#112233", bottomColor: "#445566" }).config,
      "#123456",
    );

    expect(markup).toContain('fill="#112233"');
    expect(markup).toContain('fill="#445566"');
    expect(markup).not.toContain("fill-opacity");
  });

  it("rejects non-hexadecimal signal colors", () => {
    expect(() => createTrack({ topColor: "rebeccapurple" })).toThrow(/six-digit hexadecimal color/);
    expect(() => createTrack({ bottomColor: "#abc" })).toThrow(/six-digit hexadecimal color/);
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
      visibleRegion={region}
      region={region}
      width={1}
      height={35}
    />,
  );
}
