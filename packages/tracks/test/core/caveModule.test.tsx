// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { caveModule } from "@weng-lab/genomebrowser-tracks/cave";
import { mountTrack } from "../mountTrack";

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
  });

  it("renders concrete config colors directly", async () => {
    const defaultMarkup = await renderFull(createTrack().config, "#123456");
    const bottomOnlyMarkup = await renderFull(
      createTrack({ bottomColor: "#654321" }).config,
      "#123456",
    );
    const configuredMarkup = await renderFull(
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

  it("does not alter configured colors with opacity", async () => {
    const markup = await renderFull(
      createTrack({ topColor: "#112233", bottomColor: "#445566" }).config,
      "#123456",
    );

    expect(markup).toContain('fill="#112233"');
    expect(markup).toContain('fill="#445566"');
    expect(markup.match(/<path[^>]*>/g)?.every((path) => !path.includes("fill-opacity"))).toBe(
      true,
    );
  });

  it("rejects non-hexadecimal signal colors", () => {
    expect(() => createTrack({ topColor: "rebeccapurple" })).toThrow(/six-digit hexadecimal color/);
    expect(() => createTrack({ bottomColor: "#abc" })).toThrow(/six-digit hexadecimal color/);
  });
});

function createTrack(colors: { topColor?: string; bottomColor?: string } = {}) {
  return caveModule.create({
    base: {
      id: "cave",
      title: "CAVE",
    },
    config: { neurotransmitter: "GABA", age: "Adulthood", ...colors },
  });
}

async function renderFull(config: ReturnType<typeof createTrack>["config"], color: string) {
  const view = await mountTrack({
    module: caveModule,
    track: { base: { id: "cave", title: "CAVE", color, height: 35 }, config },
    data,
    region,
    width: 1,
  });
  return view.content.innerHTML;
}
