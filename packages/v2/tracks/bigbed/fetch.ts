import axios from "axios/dist/axios.js";
import { AxiosDataLoader, BigWigReader, FileType } from "genomic-reader";
import type { TrackFetchContext } from "../../src/modules/types";
import { createBigBedSchemaParser } from "./schema";
import type { BigBedConfig, BigBedData, BigBedRow } from "./types";

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
  await ensureBrowserBuffer();

  const dataLoader = new AxiosDataLoader(config.url, axios.create() as never);
  const reader = new BigWigReader(dataLoader);
  const header = await reader.getHeader();

  if (header.fileType !== FileType.BigBed) {
    throw new Error("BigBed module only supports BigBed files");
  }

  const rows = config.schema
    ? ((await reader.readBigBedData(
        region.chromosome,
        region.start,
        region.chromosome,
        region.end,
        createBigBedSchemaParser(config.schema),
      )) as RawBigBedRow[])
    : ((await reader.readBigBedData(
        region.chromosome,
        region.start,
        region.chromosome,
        region.end,
      )) as RawBigBedRow[]);

  const visibleRows: BigBedRow[] = [];
  for (const row of rows) {
    const normalized = normalizeBigBedRow(row);
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
