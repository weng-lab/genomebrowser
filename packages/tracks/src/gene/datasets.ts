export type GeneDataset = Readonly<{
  id: string;
  assembly: string;
  variant: "basic" | "comprehensive";
  version: number;
  url: string;
}>;

export const geneDatasets = [
  {
    id: "gencode-v29-basic",
    assembly: "hg38",
    variant: "basic",
    version: 29,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v29.basic.annotation.bb",
  },
  {
    id: "gencode-v29-comprehensive",
    assembly: "hg38",
    variant: "comprehensive",
    version: 29,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v29.comprehensive.annotation.bb",
  },
  {
    id: "gencode-v40-basic",
    assembly: "hg38",
    variant: "basic",
    version: 40,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v40.basic.annotation.bb",
  },
  {
    id: "gencode-v40-comprehensive",
    assembly: "hg38",
    variant: "comprehensive",
    version: 40,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v40.comprehensive.annotation.bb",
  },
  {
    id: "gencode-v46-basic",
    assembly: "hg38",
    variant: "basic",
    version: 46,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v46.basic.annotation.bb",
  },
  {
    id: "gencode-v46-comprehensive",
    assembly: "hg38",
    variant: "comprehensive",
    version: 46,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v46.comprehensive.annotation.bb",
  },
  {
    id: "gencode-v47-basic",
    assembly: "hg38",
    variant: "basic",
    version: 47,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v47.basic.annotation.bb",
  },
  {
    id: "gencode-v47-comprehensive",
    assembly: "hg38",
    variant: "comprehensive",
    version: 47,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v47.comprehensive.annotation.bb",
  },
  {
    id: "gencode-v48-basic",
    assembly: "hg38",
    variant: "basic",
    version: 48,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v48.basic.annotation.bb",
  },
  {
    id: "gencode-v48-comprehensive",
    assembly: "hg38",
    variant: "comprehensive",
    version: 48,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v48.comprehensive.annotation.bb",
  },
  {
    id: "gencode-v49-basic",
    assembly: "hg38",
    variant: "basic",
    version: 49,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v49.basic.annotation.bb",
  },
  {
    id: "gencode-v49-comprehensive",
    assembly: "hg38",
    variant: "comprehensive",
    version: 49,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v49.comprehensive.annotation.bb",
  },
  {
    id: "gencode-v50-basic",
    assembly: "hg38",
    variant: "basic",
    version: 50,
    url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v50.basic.annotation.bb",
  },
] as const satisfies readonly GeneDataset[];

export function getGeneDatasetsForAssembly(assembly: string): readonly GeneDataset[] {
  return geneDatasets.filter((dataset) => dataset.assembly === assembly);
}
