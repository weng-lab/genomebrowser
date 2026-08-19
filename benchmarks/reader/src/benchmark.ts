import { bed3Schema, createBigBedFile, createBigWigFile } from "@weng-lab/genomic-reader";
import axios from "axios";
import { AxiosDataLoader, BigWigReader } from "genomic-reader";
import {
  cacheBustedUrl,
  withRequestContext,
  type ReaderName,
  type RequestContext,
} from "./network";

export type Dataset = {
  id: string;
  label: string;
  format: "bigBed" | "bigWig";
  url: string;
};

export type Region = {
  chromosome: string;
  start: number;
  end: number;
};

export type BenchmarkMode = "cold" | "warm";

export type ReaderMetrics = {
  count: number;
  samples: number[];
  median: number;
  p95: number;
};

export type BenchmarkResult = {
  dataset: Dataset;
  region: Region;
  size: number;
  mode: BenchmarkMode;
  newReader: ReaderMetrics;
  oldReader: ReaderMetrics;
  countsMatch: boolean;
  winner: ReaderName | "tie";
};

type ReaderAdapter = {
  read(region: Region): Promise<unknown[]>;
};

export function runSequentially<Value>(
  values: Iterable<Value>,
  operation: (value: Value) => Promise<void>,
): Promise<void> {
  const iterator = values[Symbol.iterator]();

  async function runNext(): Promise<void> {
    const next = iterator.next();
    if (next.done) return;
    await operation(next.value);
    return runNext();
  }

  return runNext();
}

export const DATASETS: readonly Dataset[] = [
  {
    id: "astro-peaks",
    label: "Astro peaks",
    format: "bigBed",
    url: "https://downloads.wenglab.org/Astro.PeakCalls.bb",
  },
  {
    id: "ccres",
    label: "GRCh38 cCREs",
    format: "bigBed",
    url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
  },
  {
    id: "dnase",
    label: "DNase aggregate",
    format: "bigWig",
    url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
  },
  {
    id: "h3k4me3",
    label: "H3K4me3 aggregate",
    format: "bigWig",
    url: "https://downloads.wenglab.org/H3K4me3_All_ENCODE_MAR20_2024_merged.bw",
  },
] as const;

export const REGION_SIZES = [1_000, 5_000, 10_000, 25_000, 49_999] as const;
export const REGION_SEED = 0x6a09e667;
const CHR1_SIZE = 248_956_422;

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = seededRandom(REGION_SEED);

export const REGIONS = new Map<string, Region>(
  DATASETS.flatMap((dataset) =>
    REGION_SIZES.map((size) => {
      const start = Math.floor(random() * (CHR1_SIZE - size + 1));
      return [`${dataset.id}:${size}`, { chromosome: "chr1", start, end: start + size }];
    }),
  ),
);

function createNewReader(dataset: Dataset): ReaderAdapter {
  if (dataset.format === "bigBed") {
    return createBigBedFile({ url: dataset.url, schema: bed3Schema });
  }
  return createBigWigFile({ url: dataset.url });
}

function createOldReader(dataset: Dataset): ReaderAdapter {
  const client = axios.create();
  client.interceptors.request.use((config) => {
    if (config.url !== undefined) config.url = cacheBustedUrl(config.url, "old");
    return config;
  });
  const reader = new BigWigReader(new AxiosDataLoader(dataset.url, client as never));

  return {
    read(region) {
      const args = [region.chromosome, region.start, region.chromosome, region.end] as const;
      return dataset.format === "bigBed"
        ? reader.readBigBedData(...args)
        : reader.readBigWigData(...args);
    },
  };
}

function createReader(name: ReaderName, dataset: Dataset): ReaderAdapter {
  return name === "new" ? createNewReader(dataset) : createOldReader(dataset);
}

async function timeRead(
  reader: ReaderAdapter,
  region: Region,
  label: string,
  context: RequestContext,
): Promise<{ count: number; duration: number }> {
  const startMark = `${label}:start`;
  const endMark = `${label}:end`;
  performance.mark(startMark);
  const records = await withRequestContext(context, () => reader.read(region));
  performance.mark(endMark);
  const measure = performance.measure(label, startMark, endMark);
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  return { count: records.length, duration: measure.duration };
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * fraction) - 1];
}

function metrics(samples: readonly { count: number; duration: number }[]): ReaderMetrics {
  const durations = samples.map(({ duration }) => duration);
  const counts = new Set(samples.map(({ count }) => count));
  return {
    count: counts.size === 1 ? samples[0].count : -1,
    samples: durations,
    median: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
  };
}

export async function runComparison(
  dataset: Dataset,
  region: Region,
  mode: BenchmarkMode,
  sampleCount: number,
): Promise<BenchmarkResult> {
  const readers =
    mode === "warm" ? { new: createNewReader(dataset), old: createOldReader(dataset) } : undefined;
  const samples: Record<ReaderName, { count: number; duration: number }[]> = {
    new: [],
    old: [],
  };
  const size = region.end - region.start;
  const newFirst = (dataset.id.length + size + (mode === "warm" ? 1 : 0)) % 2 === 0;

  if (readers !== undefined) {
    const primeOrder: readonly ReaderName[] = newFirst ? ["new", "old"] : ["old", "new"];
    // Prime sequentially to avoid one reader's network traffic affecting the other reader's cache.
    await runSequentially(primeOrder, async (name) => {
      await withRequestContext({ dataset: dataset.id, mode, size, sample: 0, phase: "prime" }, () =>
        readers[name].read(region),
      );
    });
  }

  // Measurements are sequential and alternate reader order to limit ordering and contention bias.
  await runSequentially(
    Array.from({ length: sampleCount }, (_, sample) => sample),
    async (sample) => {
      const sampleNewFirst = sample % 2 === 0 ? newFirst : !newFirst;
      const order: readonly ReaderName[] = sampleNewFirst ? ["new", "old"] : ["old", "new"];
      await runSequentially(order, async (name) => {
        const reader = readers?.[name] ?? createReader(name, dataset);
        const label = `reader:${name}:${mode}:${dataset.id}:${region.start}-${region.end}:sample-${sample + 1}`;
        samples[name].push(
          await timeRead(reader, region, label, {
            dataset: dataset.id,
            mode,
            size,
            sample: sample + 1,
            phase: "measure",
          }),
        );
      });
    },
  );

  const newReader = metrics(samples.new);
  const oldReader = metrics(samples.old);
  return {
    dataset,
    region,
    size,
    mode,
    newReader,
    oldReader,
    countsMatch: newReader.count >= 0 && newReader.count === oldReader.count,
    winner:
      newReader.median === oldReader.median
        ? "tie"
        : newReader.median < oldReader.median
          ? "new"
          : "old",
  };
}
