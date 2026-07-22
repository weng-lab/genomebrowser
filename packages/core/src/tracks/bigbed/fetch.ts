import axios from "axios";
import { AxiosDataLoader, BigWigReader, FileType } from "genomic-reader";
import type { TrackFetchContext } from "../../modules/types";
import type { BrowserRegion } from "../../modules/utils/region";
import { createBigBedSchemaParser } from "./schema";
import type { BigBedConfig, BigBedData, BigBedRow, BigBedSchema, InferBigBedRow } from "./types";

type RawBigBedRow = Partial<BigBedRow> & {
  chrom?: string;
  chr?: string;
  chromStart?: number;
  chromEnd?: number;
  rest?: string[] | string;
};

export async function fetchBigBed({
  config,
  region,
}: TrackFetchContext<BigBedConfig>): Promise<BigBedData> {
  return fetchBigBedRows({
    url: config.url,
    region,
  });
}

export async function fetchBigBedRows<TSchema extends BigBedSchema | undefined = undefined>({
  url,
  schema,
  region,
}: {
  url: string;
  schema?: TSchema;
  region: BrowserRegion;
}): Promise<InferBigBedRow<TSchema>[]> {
  await ensureBrowserBuffer();

  const dataLoader = new AxiosDataLoader(url, axios.create() as never);
  const reader = new BigWigReader(dataLoader);
  const header = await reader.getHeader();

  if (header.fileType !== FileType.BigBed) {
    throw new Error("BigBed module only supports BigBed files");
  }

  const rows = schema
    ? ((await reader.readBigBedData(
        region.chromosome,
        region.start,
        region.chromosome,
        region.end,
        createBigBedSchemaParser(schema),
      )) as RawBigBedRow[])
    : ((await reader.readBigBedData(
        region.chromosome,
        region.start,
        region.chromosome,
        region.end,
      )) as RawBigBedRow[]);

  const visibleRows: InferBigBedRow<TSchema>[] = [];
  for (const row of rows) {
    const normalized = normalizeBigBedRow(row) as InferBigBedRow<TSchema>;
    if (normalized.end >= region.start && normalized.start <= region.end) {
      visibleRows.push(normalized);
    }
  }
  return visibleRows;
}

function normalizeBigBedRow(row: RawBigBedRow): BigBedRow {
  return {
    ...row,
    chr: row.chr ?? row.chrom,
    start: row.start ?? row.chromStart ?? 0,
    end: row.end ?? row.chromEnd ?? 0,
  };
}

async function ensureBrowserBuffer() {
  if (typeof window === "undefined" || typeof globalThis.Buffer !== "undefined") return;
  const { Buffer } = await import("buffer");
  globalThis.Buffer = Buffer;
}
