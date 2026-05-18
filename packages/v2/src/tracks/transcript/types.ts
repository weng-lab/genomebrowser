import type { TrackConfigBase } from "../../modules/types";

export type TranscriptDisplay = "squish" | "pack";

export type TranscriptConfig = TrackConfigBase & {
  type: "transcript";
  display: TranscriptDisplay;
  assembly: string;
  version: number;
};

export type TranscriptInput = {
  id: string;
  title: string;
  assembly: string;
  version: number;
  display?: TranscriptDisplay;
  height?: number;
  color?: string;
};
