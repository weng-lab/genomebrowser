import { Track } from "@weng-lab/genomebrowser";
import { tfPeaksTrack } from "../../../Custom/TfPeaks";
import { CreateTrackOptions } from "../../types";
import { OtherTrackInfo } from "./types";

export function createOtherTrack(
  row: OtherTrackInfo,
  _options: CreateTrackOptions,
): Track | null {
  if (row.id === "tf-peaks") {
    return { ...tfPeaksTrack };
  }

  return null;
}
