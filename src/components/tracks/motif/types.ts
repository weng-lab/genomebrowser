import { Config, TrackType } from "../types";

export interface MotifConfig extends Config<any> {
  trackType: TrackType.Motif;
  consensusRegex: string;
  peaksAccession: string;
  assembly: string;
}
