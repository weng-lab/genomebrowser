import { describe, expect, it } from "vitest";
import { getGeneDatasetsForAssembly } from "../../src/gene/datasets";

describe("gene datasets", () => {
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
