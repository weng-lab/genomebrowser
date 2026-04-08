export type MohdSignalTrackInfo = {
  assay: string;
  fileName: string;
  fileType: string;
  url: string;
};

export type MohdMethylStrandUrls = {
  cpg: string;
  chg: string;
  chh: string;
  depth: string;
};

export type MohdWgbsTrackInfo = {
  assay: "WGBS";
  fileName: string;
  fileType: string;
  urls: {
    plusStrand: MohdMethylStrandUrls;
    minusStrand: MohdMethylStrandUrls;
  };
};

export type MohdTrackInfo = MohdSignalTrackInfo | MohdWgbsTrackInfo;

export type MohdSampleInfo = {
  sampleId: string;
  rows: MohdTrackInfo[];
};

export type MohdRowInfo = MohdTrackInfo & {
  id: string;
  sampleId: string;
};

export type MohdDataFile = {
  samples: MohdSampleInfo[];
};
