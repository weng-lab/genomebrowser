import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import {
  defineTrackModule,
  type TrackFetchContext,
  type TrackResources,
} from "@weng-lab/genomebrowser";
import type { BigBedRecord } from "@weng-lab/genomic-reader";
import {
  bigBedModule,
  fetchBigBedRows,
  type BigBedData,
} from "@weng-lab/genomebrowser-tracks/bigbed";

const reader = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@weng-lab/genomic-reader", async (original) => ({
  ...(await original<typeof import("@weng-lab/genomic-reader")>()),
  createBigBedFile: reader.create,
}));

const narrowPeakSchema = z.object({
  name: z.string(),
  score: z.coerce.number().int().min(0),
  strand: z.string(),
  signalValue: z.coerce.number(),
  pValue: z.coerce.number(),
  qValue: z.coerce.number(),
  peak: z.coerce.number().int().min(-1),
});
type NarrowPeakRow = BigBedRecord<typeof narrowPeakSchema>;
const configSchema = bigBedModule.configSchema.omit({ bedSchema: true });
const narrowPeakModule = defineTrackModule<NarrowPeakRow>()({
  type: "narrowpeak",
  configSchema,
  defaults: { height: 12, color: "#4b9560" },
  render: bigBedModule.render,
  fetch: ({
    track,
    demand,
    resources,
  }: TrackFetchContext<z.output<typeof configSchema>>): Promise<BigBedData> =>
    fetchBigBedRows({
      url: track.config.url,
      region: demand.region,
      schema: narrowPeakSchema,
      resources,
    }),
  tooltipComponent: ({ item }) => {
    expectTypeOf(item.signalValue).toEqualTypeOf<number>();
    return null;
  },
});

function createResources(): TrackResources {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string) => values.get(key) as T | undefined,
    set: (key, value) => {
      values.set(key, value);
    },
    delete: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
  };
}

describe("fetchBigBedRows", () => {
  it("reuses readers across views and isolates URLs, schema identities, and track resources", async () => {
    reader.create.mockReset();
    const read = vi.fn(async () => []);
    reader.create.mockImplementation(() => ({ read }));
    const resources = createResources();
    const region = { chromosome: "chr1", start: 100, end: 200 };
    const input = { url: "YOUR_URL_HERE", region, schema: narrowPeakSchema, resources };
    await fetchBigBedRows(input);
    const nextRegion = { ...region, start: 200, end: 300 };
    await fetchBigBedRows({ ...input, region: nextRegion });
    expect(reader.create).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenLastCalledWith(nextRegion, { signal: undefined });
    await fetchBigBedRows({ ...input, url: "OTHER_URL_HERE" });
    await fetchBigBedRows({ ...input, schema: narrowPeakSchema.clone() });
    await fetchBigBedRows({ ...input, resources: createResources() });
    expect(reader.create).toHaveBeenCalledTimes(4);
    await fetchBigBedRows(input);
    expect(reader.create).toHaveBeenCalledTimes(4);
    resources.clear();
    await fetchBigBedRows(input);
    expect(reader.create).toHaveBeenCalledTimes(5);
  });

  it("composes with BigBed rendering and preserves custom column types and read failures", async () => {
    reader.create.mockReset();
    const rows: NarrowPeakRow[] = [
      {
        chromosome: "chr1",
        start: 100,
        end: 200,
        fields: [],
        name: "peak",
        score: 5753,
        strand: ".",
        signalValue: 10,
        pValue: -1,
        qValue: 575.381,
        peak: -1,
      },
    ];
    const read = vi.fn().mockResolvedValue(rows);
    reader.create.mockReturnValue({ read });
    const context = {
      track: narrowPeakModule.create({
        base: { id: "peaks", title: "Peaks" },
        config: { url: "YOUR_URL_HERE" },
      }),
      demand: {
        basePairDetail: true,
        assembly: { id: "test", chromosomes: { chr1: 1000 } },
        region: { chromosome: "chr1", start: 100, end: 200 },
        visibleRegion: { chromosome: "chr1", start: 100, end: 200 },
        width: 100,
      },
      resources: createResources(),
    };
    const result = await narrowPeakModule.fetch(context);
    expectTypeOf(result).toEqualTypeOf<BigBedData>();
    const typedRows = await fetchBigBedRows({
      url: context.track.config.url,
      region: context.demand.region,
      schema: narrowPeakSchema,
      resources: context.resources,
    });
    expectTypeOf(typedRows).toEqualTypeOf<NarrowPeakRow[]>();
    expect(result).toBe(rows);
    expect(reader.create).toHaveBeenCalledWith({ url: "YOUR_URL_HERE", schema: narrowPeakSchema });
    const failure = new Error("Cannot read BigBed");
    read.mockRejectedValueOnce(failure);
    await expect(narrowPeakModule.fetch(context)).rejects.toBe(failure);
  });
});
