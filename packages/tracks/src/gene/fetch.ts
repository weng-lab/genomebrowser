import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import type { BigBedRecord } from "@weng-lab/genomic-reader";
import { readCachedBigBedRows } from "../shared/cachedFiles";
import { bigGenePredSchema } from "./schema";
import { publishObservedGeneTags } from "./tagCatalog";
import type {
  BigGenePredPlusV1Source,
  BigGenePredSource,
  GeneAttributes,
  GeneConfig,
  GeneData,
  GeneExon,
  GeneTranscript,
} from "./types";

type BigGenePredRecord = BigBedRecord<typeof bigGenePredSchema>;

export async function fetchGene({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<GeneConfig>): Promise<GeneData> {
  const rows = await readCachedBigBedRows(resources, config.url, bigGenePredSchema, region);
  const transcripts = rows.map(parseBigGenePredRecord);
  publishObservedGeneTags(
    config.url,
    transcripts.flatMap((transcript) => transcript.tags),
  );
  return transcripts;
}

export function parseBigGenePredRecord(row: BigGenePredRecord): GeneTranscript {
  const label = row.name || "unnamed transcript";
  assertCoordinate(
    Number.isInteger(row.start) && row.start >= 0,
    label,
    "start must be a non-negative integer",
  );
  assertCoordinate(
    Number.isInteger(row.end) && row.end > row.start,
    label,
    "end must be greater than start",
  );
  assertCoordinate(
    Number.isInteger(row.thickStart) && row.thickStart >= row.start && row.thickStart <= row.end,
    label,
    "thickStart must be inside the transcript interval",
  );
  assertCoordinate(
    Number.isInteger(row.thickEnd) && row.thickEnd >= row.thickStart && row.thickEnd <= row.end,
    label,
    "thickEnd must be between thickStart and the transcript end",
  );

  if (
    row.blockSizes.length !== row.blockCount ||
    row.chromStarts.length !== row.blockCount ||
    row.exonFrames.length !== row.blockCount
  ) {
    throw new Error(
      `Invalid BigGenePred record ${label}: blockCount must match blockSizes, chromStarts, and exonFrames.`,
    );
  }

  const exons: GeneExon[] = [];
  for (let index = 0; index < row.blockCount; index += 1) {
    const offset = row.chromStarts[index]!;
    const size = row.blockSizes[index]!;
    const start = row.start + offset;
    const end = start + size;
    const previous = exons.at(-1);
    assertCoordinate(
      Number.isInteger(offset) && offset >= 0 && Number.isInteger(size) && size > 0,
      label,
      "block offsets must be non-negative integers and block sizes must be positive integers",
    );
    assertCoordinate(
      start >= row.start && end <= row.end,
      label,
      "every block must be inside the transcript interval",
    );
    assertCoordinate(
      !previous || start >= previous.end,
      label,
      "blocks must be ordered and non-overlapping",
    );
    const frameIndex = row.strand === "+" ? index : row.blockCount - index - 1;
    const frame = row.exonFrames[frameIndex]!;
    assertCoordinate(
      frame === -1 || frame === 0 || frame === 1 || frame === 2,
      label,
      "exon frames must be -1, 0, 1, or 2",
    );
    exons.push({ start, end, frame });
  }
  assertCoordinate(
    exons[0]?.start === row.start,
    label,
    "the first block must start at the transcript start",
  );
  assertCoordinate(
    exons.at(-1)?.end === row.end,
    label,
    "the last block must end at the transcript end",
  );

  const expanded = parseExpandedFields(row.fields, label);
  const source: BigGenePredSource | BigGenePredPlusV1Source = {
    ...row,
    blockSizes: [...row.blockSizes],
    chromStarts: [...row.chromStarts],
    exonFrames: [...row.exonFrames],
    fields: [],
    ...expanded,
  };
  return {
    kind: "transcript",
    chromosome: row.chromosome,
    start: row.start,
    end: row.end,
    strand: row.strand,
    transcriptId: row.name,
    transcriptName: row.name2.trim() || row.name,
    geneId: row.geneName,
    geneName: row.geneName2.trim() || row.geneName,
    tags: expanded
      ? [
          ...new Set(
            expanded.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        ]
      : [],
    attributes: expanded ? parseAttributes(expanded.attributes, label) : {},
    exons,
    source,
  };
}

function parseExpandedFields(
  fields: string[],
  label: string,
): Pick<BigGenePredPlusV1Source, "tags" | "attributes"> | undefined {
  if (fields.length === 0) return undefined;
  if (fields.length !== 2) {
    throw new Error(
      `Invalid BigGenePred record ${label}: expected either the standard fields or the tags and attributes extension.`,
    );
  }
  return { tags: fields[0]!, attributes: fields[1]! };
}

function parseAttributes(value: string, label: string): GeneAttributes {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid BigGenePred record ${label}: attributes must be valid JSON.`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid BigGenePred record ${label}: attributes must be a JSON object.`);
  }

  const attributes: GeneAttributes = {};
  for (const [key, attribute] of Object.entries(parsed)) {
    if (
      typeof attribute !== "string" &&
      (!Array.isArray(attribute) || attribute.some((entry) => typeof entry !== "string"))
    ) {
      throw new Error(
        `Invalid BigGenePred record ${label}: attribute values must be strings or string arrays.`,
      );
    }
    attributes[key] = Array.isArray(attribute) ? [...attribute] : attribute;
  }
  return attributes;
}

function assertCoordinate(condition: boolean, label: string, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid BigGenePred record ${label}: ${message}.`);
}
