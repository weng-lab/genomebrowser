import { describe, expect, it } from "vitest";
import { createFetchSignature } from "../../src/modules/fetchOnChange";
import { methylCModule } from "../../src/tracks/methylc/module";
import type { MethylCUrls } from "../../src/tracks/methylc/types";

describe("MethylC module", () => {
  it("creates a split-display methylc config with defaults", () => {
    const track = methylCModule.create({
      id: "methylc",
      title: "MethylC",
      config: { urls: createUrls("YOUR_URL_HERE") },
    });

    expect(track).toMatchObject({
      type: "methylc",
      base: {
        id: "methylc",
        title: "MethylC",
        display: "split",
        height: 100,
      },
      config: {
        colors: {
          cpg: "#648bd8",
          chg: "#ff944d",
          chh: "#ff00ff",
          depth: "#525252",
        },
        maskCpgByCoverage: false,
        urls: createUrls("YOUR_URL_HERE"),
      },
    });
    expect(methylCModule.tooltipComponent).toBeTypeOf("function");
    expect(track).not.toHaveProperty("tooltip");
  });

  it("rejects combined as a display mode", () => {
    expect(() =>
      methylCModule.create({
        id: "methylc",
        title: "MethylC",
        display: "combined" as never,
        config: { urls: createUrls("YOUR_URL_HERE") },
      }),
    ).toThrow(/methylc input/);
  });

  it("allows empty channel URLs", () => {
    expect(() =>
      methylCModule.create({
        id: "methylc",
        title: "MethylC",
        config: { urls: createUrls("") },
      }),
    ).not.toThrow();
  });

  it("rejects invalid ranges", () => {
    expect(() =>
      methylCModule.create({
        id: "methylc",
        title: "MethylC",
        config: {
          urls: createUrls("YOUR_URL_HERE"),
          range: { min: 1, max: 0 },
        },
      }),
    ).toThrow(/methylc input/);
  });

  it("rejects non-hexadecimal channel colors", () => {
    expect(() =>
      methylCModule.create({
        id: "methylc",
        title: "MethylC",
        config: {
          urls: createUrls("YOUR_URL_HERE"),
          colors: {
            cpg: "rebeccapurple",
            chg: "#ff944d",
            chh: "#ff00ff",
            depth: "#525252",
          },
        },
      }),
    ).toThrow(/six-digit hexadecimal color/);
  });

  it("includes nested URLs in fetch signatures", () => {
    const track = methylCModule.create({
      id: "methylc",
      title: "MethylC",
      config: { urls: createUrls("URL_A") },
    });

    const changedColor = {
      ...track,
      config: { ...track.config, colors: { ...track.config.colors, cpg: "#000000" } },
    };
    const changedUrl = {
      ...track,
      config: {
        ...track.config,
        urls: {
          ...track.config.urls,
          plusStrand: {
            ...track.config.urls.plusStrand,
            cpg: { url: "URL_B" },
          },
        },
      },
    };

    expect(createFetchSignature(methylCModule, changedColor)).toBe(
      createFetchSignature(methylCModule, track),
    );
    expect(createFetchSignature(methylCModule, changedUrl)).not.toBe(
      createFetchSignature(methylCModule, track),
    );
  });
});

function createUrls(url: string): MethylCUrls {
  return {
    plusStrand: {
      cpg: { url },
      chg: { url },
      chh: { url },
      depth: { url },
    },
    minusStrand: {
      cpg: { url },
      chg: { url },
      chh: { url },
      depth: { url },
    },
  };
}
