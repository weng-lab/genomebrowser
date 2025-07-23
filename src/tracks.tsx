import {
  BigBedConfig,
  BigWigConfig,
  BulkBedConfig,
  DisplayMode,
  MotifConfig,
  Rect,
  TrackType,
  TranscriptConfig,
  Vibrant,
} from "./lib";

export const bigWigExample: BigWigConfig = {
  id: "1",
  title: "bigWig",
  titleSize: 12,
  height: 100,
  color: Vibrant[6],
  trackType: TrackType.BigWig,
  displayMode: DisplayMode.Full,
  url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
};

export const bigBedExample: BigBedConfig = {
  id: "2",
  title: "bigBed",
  titleSize: 12,
  height: 20,
  color: Vibrant[7],
  trackType: TrackType.BigBed,
  displayMode: DisplayMode.Dense,
  url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
  tooltip: (rect: Rect) => {
    return (
      <g>
        <text>{rect.name}</text>
      </g>
    );
  },
};

export const transcriptExample: TranscriptConfig = {
  id: "3",
  title: "genes",
  titleSize: 12,
  height: 50,
  color: Vibrant[8],
  trackType: TrackType.Transcript,
  assembly: "GRCh38",
  version: 47,
  displayMode: DisplayMode.Squish,
};

export const motifExample: MotifConfig = {
  id: "4",
  title: "motif",
  titleSize: 12,
  height: 100,
  color: Vibrant[1],
  peakColor: Vibrant[3],
  trackType: TrackType.Motif,
  displayMode: DisplayMode.Squish,
  assembly: "GRCh38",
  consensusRegex: "gcca[cg][ct]ag[ag]gggcgc",
  peaksAccession: "ENCFF992CTF",
  onHover: (rect) => {
    console.log(rect);
  },
  onLeave: (rect) => {
    console.log(rect);
  },
};

export const bulkBedExample: BulkBedConfig = {
  id: "5",
  title: "bulk BigBed",
  titleSize: 12,
  height: 30,
  gap: 2,
  color: Vibrant[2],
  trackType: TrackType.BulkBed,
  displayMode: DisplayMode.Full,
  datasets: [
    {
      name: "ChIP Dataset 1",
      url: "https://downloads.wenglab.org/ChIP_ENCSR000AKA-ENCSR000AKC-ENCSR000AKF-ENCSR000AKE-ENCSR000AKD-ENCSR000AOX.bigBed",
    },
    {
      name: "ChIP Dataset 2",
      url: "https://downloads.wenglab.org/ChIP_ENCSR000EWA-ENCSR000AKP-ENCSR000EWC-ENCSR000DWB-ENCSR000EWB-ENCSR000APE.bigBed",
    },
    {
      name: "ChIP Dataset 3",
      url: "https://downloads.wenglab.org/ChIP_ENCSR000ARA-ENCSR000AQW-ENCSR000AQY-ENCSR000AQX-ENCSR000ASX-ENCSR000ARZ.bigBed",
    },
  ],
  tooltip: (rect) => {
    return (
      <g>
        <rect width={160} height={45} fill="white" stroke="none" filter="drop-shadow(2px 2px 2px rgba(0,0,0,0.2))" />
        <text x={10} y={20} fontSize={12} fontWeight="bold">
          {rect.name}
        </text>
        <text x={10} y={35} fontSize={12}>
          {rect.datasetName}
        </text>
      </g>
    );
  },
} as BulkBedConfig;
