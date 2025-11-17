import {
  BigBedConfig,
  BigWigConfig,
  createTrackStoreMemo,
  DisplayMode,
  Rect,
  TrackType,
  TranscriptConfig,
  Vibrant,
} from "@weng-lab/genomebrowser";
import { TrackSelect } from "../src/lib";
import React from "react";
import { createRoot } from "react-dom/client";

function Main() {
  const trackStore = createTrackStoreMemo(
    [transcriptExample, bigWigExample, bigBedExample],
    []
  );
  return (
    <div>
      <TrackSelect trackStore={trackStore} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Main />);

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
