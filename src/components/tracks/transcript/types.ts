import { BaseConfig, TrackType } from "../types";

export interface TranscriptConfig extends BaseConfig {
  trackType: TrackType.Transcript;
  refetch: () => void;
  assembly: string;
  version: number;
}
