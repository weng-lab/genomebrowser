import { capitalize } from "@mui/material";
import Fuse, { FuseResult } from "fuse.js";
import humanTracksData from "../Data/humanBiosamples.json";
import mouseTracksData from "../Data/mouseBiosamples.json";
import { AssayInfo, RowInfo, SearchTracksProps, TrackInfo } from "../types";
import { Assembly } from "../consts";

const tracksDataByAssembly: Record<Assembly, typeof humanTracksData> = {
  GRCh38: humanTracksData,
  mm10: mouseTracksData,
};

export function getTracksData(assembly: Assembly) {
  return tracksDataByAssembly[assembly];
}

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
    case "ccre":
      return "cCRE";
    case "rnaseq":
      return "RNA-seq";
    default:
      return assay;
  }
}

/** Convert display assay name to JSON format */
function toJsonAssayType(displayName: string): string {
  switch (displayName.toLowerCase()) {
    case "dnase":
      return "dnase";
    case "atac":
      return "atac";
    case "h3k4me3":
      return "h3k4me3";
    case "h3k27ac":
      return "h3k27ac";
    case "ctcf":
      return "ctcf";
    case "chromhmm":
      return "chromhmm";
    case "ccre":
      return "ccre";
    case "rna-seq":
      return "rnaseq";
    default:
      return displayName.toLowerCase();
  }
}

// use to get nested data in JSON file
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => acc && acc[key], obj);
}

export function getTracksByAssayAndOntology(
  assay: string,
  ontology: string,
  tracksData: ReturnType<typeof getTracksData>,
): TrackInfo[] {
  let res: TrackInfo[] = [];
  const data = getNestedValue(tracksData, "tracks");
  const jsonAssay = toJsonAssayType(assay);

  data.forEach((track: TrackInfo) => {
    const filteredAssays =
      track.assays?.filter((e: AssayInfo) => e.assay === jsonAssay) || [];
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

/** Flatten TrackInfo into RowInfo objects for DataGrid display.
 * @param track TrackInfo object containing information from JSON file
 * @returns Array of flattened RowInfo objects, one per assay
 */
export function flattenIntoRows(track: TrackInfo): RowInfo[] {
  const { ontology, lifeStage, sampleType, displayname } = track;

  return track.assays.map(
    ({ id, assay, experimentAccession, fileAccession, url }) => ({
      id,
      ontology: capitalize(ontology),
      lifeStage: capitalize(lifeStage),
      sampleType: capitalize(sampleType),
      displayname: capitalize(displayname),
      assay: formatAssayType(assay),
      experimentAccession,
      fileAccession,
      url,
    }),
  );
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
  threshold = 0.75,
  tracksData,
}: SearchTracksProps & {
  tracksData: ReturnType<typeof getTracksData>;
}): FuseResult<TrackInfo>[] {
  const data = getNestedValue(tracksData, jsonStructure ?? "");

  const fuse = new Fuse(data, {
    includeScore: true,
    shouldSort: true,
    threshold: threshold,
    keys: keyWeightMap,
  });
  return fuse.search(query);
}
