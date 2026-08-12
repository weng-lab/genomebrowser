import { describe, expect, expectTypeOf, it } from "vitest";
import type { GenomicFile, GenomicRecord, GenomicRegion, ReadOptions } from "../src/lib";

function createDummyFile<T extends GenomicRecord>(records: readonly T[]): GenomicFile<T> {
  return {
    async read(region, options) {
      await Promise.resolve();
      options?.signal?.throwIfAborted();

      return records
        .filter(
          (record) =>
            record.chromosome === region.chromosome &&
            record.start < region.end &&
            record.end > region.start,
        )
        .sort(
          (a, b) => a.chromosome.localeCompare(b.chromosome) || a.start - b.start || a.end - b.end,
        );
    },
  };
}

type DummyRecord = GenomicRecord & {
  name: string;
  score: number;
  attributes: { source: string };
};

const shortRecord: DummyRecord = {
  chromosome: "chr1",
  start: 5,
  end: 15,
  name: "short",
  score: 2,
  attributes: { source: "test" },
};

const longRecord: DummyRecord = {
  chromosome: "chr1",
  start: 5,
  end: 25,
  name: "long",
  score: 1,
  attributes: { source: "test" },
};

const lateRecord: DummyRecord = {
  chromosome: "chr1",
  start: 20,
  end: 35,
  name: "late",
  score: 3,
  attributes: { source: "test" },
};

const boundaryRecord: DummyRecord = {
  chromosome: "chr1",
  start: 30,
  end: 40,
  name: "boundary",
  score: 4,
  attributes: { source: "test" },
};

describe("GenomicFile", () => {
  it("preserves inferred record data while filtering and sorting regional reads", async () => {
    const file = createDummyFile([
      lateRecord,
      longRecord,
      boundaryRecord,
      shortRecord,
      shortRecord,
    ]);
    const result = await file.read({ chromosome: "chr1", start: 10, end: 30 });

    expectTypeOf(result).toEqualTypeOf<DummyRecord[]>();
    expect(result).toEqual([shortRecord, shortRecord, longRecord, lateRecord]);
    expect(result[0]).toBe(shortRecord);
    expect(result[0]?.attributes).toBe(shortRecord.attributes);
    expect(await file.read({ chromosome: "chr2", start: 0, end: 100 })).toEqual([]);
    expect(await file.read({ chromosome: "chr1", start: 40, end: 50 })).toEqual([]);
  });

  it("keeps abort signals independent across concurrent reads", async () => {
    const file = createDummyFile([shortRecord]);
    const abortedController = new AbortController();
    const activeController = new AbortController();
    const region = { chromosome: "chr1", start: 0, end: 20 };

    const abortedRead = file.read(region, { signal: abortedController.signal });
    const activeRead = file.read(region, { signal: activeController.signal });
    abortedController.abort();

    const [abortedResult, activeResult] = await Promise.allSettled([abortedRead, activeRead]);

    expect(abortedResult.status).toBe("rejected");
    if (abortedResult.status === "rejected") {
      expect(abortedResult.reason).toMatchObject({ name: "AbortError" });
    }
    expect(activeResult).toEqual({ status: "fulfilled", value: [shortRecord] });
    expect(activeController.signal.aborted).toBe(false);
  });

  it("exposes the exact structural foundation types", () => {
    expectTypeOf<GenomicRegion>().toEqualTypeOf<{
      chromosome: string;
      start: number;
      end: number;
    }>();
    expectTypeOf<ReadOptions>().toEqualTypeOf<{ signal?: AbortSignal }>();
  });
});
