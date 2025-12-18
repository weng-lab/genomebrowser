import { capitalize } from "@mui/material";
import Fuse, { FuseResult } from "fuse.js";
import tracksData from "../modifiedTracks.json";
import { 
  AssayInfo, 
  RowInfo, 
  SearchTracksProps, 
  TrackInfo
} from "../types";

function formatAssayType(assay: string): string {
  switch (assay) {
    case "dnase":
      return "DNase";
    case "atac":
      return "ATAC";
    case "h3k4me3":
      return "H3K4me3";
    case "h3k27ac":
      return "H3K27ac";
    case "ctcf":
      return "CTCF";
    case "chromhmm":
      return "ChromHMM";
    default:
      return assay;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => acc && acc[key], obj);
}

export function getTracksByAssayAndOntology(
  assay: string,
  ontology: string,
): any[] {
  let res: any[] = [];
  const data = getNestedValue(tracksData, "tracks");

  data.forEach((track: TrackInfo) => {
    const filteredAssays =
      track.assays?.filter((e: AssayInfo) => e.assay === assay.toLowerCase()) ||
      [];
    if (
      filteredAssays.length > 0 &&
      track.ontology === ontology.toLowerCase()
    ) {
      res.push({
        ...track,
        assays: filteredAssays,
      });
    }
  });
  return res;
}

/** Flatten TrackInfo or FuseResult into RowInfo for DataGrid display.
 * @param track TrackInfo object or FuseResult containing information from JSON file
 * @returns Flattened RowInfo object
 */
export function flattenIntoRow(track: TrackInfo): RowInfo {
  const { ontology, lifeStage, sampleType, displayname } = track;
  const { assay, experimentAccession, fileAccession } = track.assays[0];

  return {
    ontology: capitalize(ontology),
    lifeStage: capitalize(lifeStage),
    sampleType: capitalize(sampleType),
    displayname: capitalize(displayname),
    assay: formatAssayType(assay),
    experimentAccession,
    fileAccession,
  };
}

/**
 * Fuzzy search in tracks stored in a JSON file.
 *
 * @param jsonStructure - Dot-separated path to the data array in the JSON structure.
 * @param query - The search query string.
 * @param keyWeightMap - Array of keys to search within each track object.
 * Can look like ["name", "author"] or if weighted, [
    {
      name: 'title',
      weight: 0.3
    },
    {
      name: 'author',
      weight: 0.7
    }
  ].
 * @param threshold - (Optional) Threshold for the fuzzy search (default is 0.5).
 *                    Smaller = stricter match, larger = fuzzier since 0 is perfect match and 1 is worst match.
 * @param limit - (Optional) Maximum number of results to return (default is 10).
 * @returns FuseResult object containing the search results.
 */
export function searchTracks({
  jsonStructure,
  query,
  keyWeightMap,
  threshold = 0.5,
  limit = 10,
}: SearchTracksProps): FuseResult<TrackInfo>[] {
  const data = getNestedValue(tracksData, jsonStructure ?? "");

  const fuse = new Fuse(data, {
    includeScore: true,
    shouldSort: true,
    threshold: threshold,
    keys: keyWeightMap,
  });
  return fuse.search(query, { limit: limit });
}