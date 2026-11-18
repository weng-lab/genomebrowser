import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import type { BigBedMetadata, BigBedFileOptions } from "@weng-lab/genomic-reader";
import type { z } from "zod";
import { getAutoSqlFieldNames } from "../shared/autoSql";
import { getCachedBigBedFile } from "../shared/cachedFiles";
import {
  haploSchema,
  triploSchema,
  geneDiseaseSchema,
  cspecSchema,
  type ClinGenConfig,
} from "./schema";
import type { ClinGenData, ClinGenKind } from "./types";

export async function fetchClinGen(
  context: TrackFetchContext<ClinGenConfig>,
  kind: ClinGenKind,
): Promise<ClinGenData> {
  const {
    track: { config },
    demand: { region, assembly },
    signal,
    resources,
  } = context;
  if (assembly.id !== "hg38") throw new Error("These ClinGen sources require the hg38 assembly.");
  if (region.end - region.start > config.maxDetailBases) return { kind: "detail-required" };

  async function read<Schema extends z.ZodObject>(schema: BigBedFileOptions<Schema>["schema"]) {
    const file = getCachedBigBedFile(resources, config.url, schema);
    validateLayout(await file.getMetadata({ signal }), schema, kind);
    return file.read(region, { signal });
  }

  switch (kind) {
    case "haplo":
      return {
        kind: "features",
        items: (await read(haploSchema)).map((row) => ({ ...row, kind, color: row.reserved })),
      };
    case "triplo":
      return {
        kind: "features",
        items: (await read(triploSchema)).map((row) => ({ ...row, kind, color: row.reserved })),
      };
    case "gene-disease":
      return {
        kind: "features",
        items: (await read(geneDiseaseSchema)).map((row) => ({ ...row, kind, color: row.itemRgb })),
      };
    case "cspec":
      return {
        kind: "features",
        items: (await read(cspecSchema)).map((row) => ({ ...row, kind, color: row.reserved })),
      };
  }
}

function validateLayout(metadata: BigBedMetadata, schema: z.ZodObject, kind: ClinGenKind) {
  const expected = ["chrom", "chromStart", "chromEnd", ...Object.keys(schema.shape)];
  if (metadata.definedFieldCount !== 9 || metadata.fieldCount !== expected.length) {
    throw new Error(
      `ClinGen ${kind} requires BED9+${expected.length - 9} (${expected.length} fields).`,
    );
  }
  if (metadata.autoSql === undefined) return;
  const names = getAutoSqlFieldNames(metadata.autoSql);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
    throw new Error(`ClinGen ${kind} AutoSQL columns do not match the expected UCSC schema.`);
  }
}
