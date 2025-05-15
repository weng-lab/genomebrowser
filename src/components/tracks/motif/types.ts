import { BaseConfig, TrackType } from "../types";

export interface MotifConfig extends BaseConfig {
  trackType: TrackType.Motif;
  consensusRegex: string;
  peaksAccession: string;
  assembly: string;
}
