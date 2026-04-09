import {
  DisplayMode,
  Track,
  TrackType,
  TranscriptConfig,
} from "@weng-lab/genomebrowser";
import { CreateTrackOptions } from "../../types";
import { GeneRowInfo } from "./types";

const defaultTranscript: Omit<TranscriptConfig, "id" | "assembly" | "version"> =
  {
    title: "GENCODE Genes",
    trackType: TrackType.Transcript,
    displayMode: DisplayMode.Squish,
    height: 100,
    color: "#0c184a",
    canonicalColor: "#100e98",
    highlightColor: "#3c69e8",
    titleSize: 12,
  };

export function createGeneTrack(
  row: GeneRowInfo,
  options: CreateTrackOptions,
): Track {
  return {
    ...defaultTranscript,
    id: row.id,
    assembly: options.assembly,
    version: row.versions[row.versions.length - 1],
  };
}
