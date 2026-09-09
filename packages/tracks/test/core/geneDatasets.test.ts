import { describe, expect, it } from "vitest";
import {
  geneModule,
  getGeneDatasetsForAssembly,
  getGeneDatasetTitle,
} from "@weng-lab/genomebrowser-tracks/gene";
import { createTrackStore } from "@weng-lab/genomebrowser";

describe("gene datasets", () => {
  it("offers only M25 basic and comprehensive for mm10, with distinct tracks for comparison", () => {
    const datasets = getGeneDatasetsForAssembly("mm10");
    expect(
      datasets.map(({ assembly, release, variant }) => ({ assembly, release, variant })),
    ).toEqual([
      { assembly: "mm10", release: "M25", variant: "basic" },
      { assembly: "mm10", release: "M25", variant: "comprehensive" },
    ]);
    const useTrackStore = createTrackStore({
      modules: [geneModule],
      tracks: datasets.map((dataset) =>
        geneModule.create({
          id: dataset.id,
          title: getGeneDatasetTitle(dataset),
          source: "host",
          config: { url: dataset.url },
        }),
      ),
    });
    expect(useTrackStore.getState().tracks.map(({ base }) => base.title)).toEqual([
      "GENCODE M25 basic",
      "GENCODE M25 comprehensive",
    ]);
    expect(getGeneDatasetsForAssembly("mm39")).toEqual([]);
    expect(getGeneDatasetsForAssembly("GRCm38")).toEqual([]);
  });

  it("returns only datasets configured for the requested assembly", () => {
    const hg38Datasets = getGeneDatasetsForAssembly("hg38");
    expect(hg38Datasets).toHaveLength(13);
    expect(hg38Datasets.map(({ variant, version }) => ({ variant, version }))).toEqual([
      { variant: "basic", version: 29 },
      { variant: "comprehensive", version: 29 },
      { variant: "basic", version: 40 },
      { variant: "comprehensive", version: 40 },
      { variant: "basic", version: 46 },
      { variant: "comprehensive", version: 46 },
      { variant: "basic", version: 47 },
      { variant: "comprehensive", version: 47 },
      { variant: "basic", version: 48 },
      { variant: "comprehensive", version: 48 },
      { variant: "basic", version: 49 },
      { variant: "comprehensive", version: 49 },
      { variant: "basic", version: 50 },
    ]);
    expect(
      hg38Datasets.every((dataset) =>
        dataset.url.startsWith("https://users.wenglab.org/niship/gencodefiles/"),
      ),
    ).toBe(true);
    expect(getGeneDatasetsForAssembly("unknown")).toEqual([]);
  });
});
