import { describe, expect, it } from "vitest";
import { createFetchSignature } from "../../src/modules/fetchOnChange";
import { methylCModule } from "../../src/tracks/methylc/module";
import type { MethylCUrls } from "../../src/tracks/methylc/types";

describe("MethylC module", () => {
  it("creates a split-display methylc config with defaults", () => {
    const config = methylCModule.create({
      id: "methylc",
      title: "MethylC",
      urls: createUrls("YOUR_URL_HERE"),
    });

    expect(config).toMatchObject({
      id: "methylc",
      type: "methylc",
      title: "MethylC",
      display: "split",
      height: 100,
      colors: {
        cpg: "#648bd8",
        chg: "#ff944d",
        chh: "#ff00ff",
        depth: "#525252",
      },
      maskCpgByCoverage: false,
      urls: createUrls("YOUR_URL_HERE"),
    });
    expect(config.tooltip).toBeTypeOf("function");
  });

  it("rejects combined as a display mode", () => {
    expect(() =>
      methylCModule.create({
        id: "methylc",
        title: "MethylC",
        display: "combined" as never,
        urls: createUrls("YOUR_URL_HERE"),
      }),
    ).toThrow(/methylc config/);
  });

  it("allows empty channel URLs", () => {
    expect(() =>
      methylCModule.create({
        id: "methylc",
        title: "MethylC",
        urls: createUrls(""),
      }),
    ).not.toThrow();
  });

  it("rejects invalid ranges", () => {
    expect(() =>
      methylCModule.create({
        id: "methylc",
        title: "MethylC",
        urls: createUrls("YOUR_URL_HERE"),
        range: { min: 1, max: 0 },
      }),
    ).toThrow(/methylc config/);
  });

  it("includes nested URLs in fetch signatures", () => {
    const config = methylCModule.create({
      id: "methylc",
      title: "MethylC",
      urls: createUrls("URL_A"),
    });

    const changedColor = { ...config, colors: { ...config.colors, cpg: "#000000" } };
    const changedUrl = {
      ...config,
      urls: {
        ...config.urls,
        plusStrand: {
          ...config.urls.plusStrand,
          cpg: { url: "URL_B" },
        },
      },
    };

    expect(createFetchSignature(methylCModule, changedColor)).toBe(
      createFetchSignature(methylCModule, config),
    );
    expect(createFetchSignature(methylCModule, changedUrl)).not.toBe(
      createFetchSignature(methylCModule, config),
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
