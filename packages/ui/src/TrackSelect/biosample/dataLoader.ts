import { capitalize } from "@mui/material";
import Fuse, { FuseResult } from "fuse.js";
import { Assembly, TrackInfo, RowInfo, AssayInfo } from "./types";
import { assayTypes, ontologyTypes, ASSAY_DISPLAY_MAP } from "./constants";
import humanTracksData from "../Data/humanBiosamples.json";
import mouseTracksData from "../Data/mouseBiosamples.json";

const tracksDataByAssembly: Record<Assembly, typeof humanTracksData> = {
  GRCh38: humanTracksData,
  mm10: mouseTracksData,
};

export function getTracksData(assembly: Assembly) {
  return tracksDataByAssembly[assembly];
}

function formatAssayType(assay: string): string {
  return ASSAY_DISPLAY_MAP[assay] || assay;
}

/** Convert display assay name to JSON format */
function toJsonAssayType(displayName: string): string {
  const entry = Object.entries(ASSAY_DISPLAY_MAP).find(
    ([_, display]) => display.toLowerCase() === displayName.toLowerCase()
  );
  return entry ? entry[0] : displayName.toLowerCase();
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
 * Build rows and rowById for a specific assembly
 */
export function buildRowsForAssembly(assembly: Assembly): {
  rows: RowInfo[];
  rowById: Map<string, RowInfo>;
} {
  const tracksData = getTracksData(assembly);
  const rows = ontologyTypes.flatMap((ontology) =>
    assayTypes.flatMap((assay) =>
      getTracksByAssayAndOntology(
        assay.toLowerCase(),
        ontology.toLowerCase(),
        tracksData,
      ).flatMap((r: TrackInfo) =>
        flattenIntoRows(r).map((flat) => ({
          ...flat,
          assay,
          ontology,
        })),
      ),
    ),
  );
  const rowById = new Map<string, RowInfo>(rows.map((r) => [r.id, r]));
  return { rows, rowById };
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
export function searchTracks(props: {
  jsonStructure: string;
  query: string;
  keyWeightMap: any[];
  threshold?: number;
  tracksData: ReturnType<typeof getTracksData>;
}): FuseResult<TrackInfo>[] {
  const { jsonStructure, query, keyWeightMap, threshold = 0.75, tracksData } = props;
  const data = getNestedValue(tracksData, jsonStructure);

  const fuse = new Fuse(data, {
    includeScore: true,
    shouldSort: true,
    threshold: threshold,
    keys: keyWeightMap,
  });
  return fuse.search(query);
}
