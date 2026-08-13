import { readFile } from "node:fs/promises";
import { afterEach, beforeAll, describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { bed3Schema, createBigBedFile, type GenomicFile, type GenomicRecord } from "../src/lib";
import { parseBbiHeader } from "../src/internal/bbi/commonHeader";

const url = "https://example.test/basic.bb";
let fixture: Uint8Array;
let uncompressedFixture: Uint8Array;
let sourceRecords: Array<GenomicRecord & { fields: string[] }>;

beforeAll(async () => {
  const [compressedBytes, uncompressedBytes, bedSource] = await Promise.all([
    readFile(new URL("./fixtures/bigbed/basic.bb", import.meta.url)),
    readFile(new URL("./fixtures/bigbed/basic-unc.bb", import.meta.url)),
    readFile(new URL("./fixtures/bigbed/basic.bed", import.meta.url), "utf8"),
  ]);
  fixture = compressedBytes;
  uncompressedFixture = uncompressedBytes;
  sourceRecords = bedSource
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const [chromosome, start, end, ...fields] = line.split("\t");
      return { chromosome: chromosome!, start: Number(start), end: Number(end), fields };
    });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function installFixtureFetch(bytes = fixture): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
    const range = new Headers(init?.headers).get("Range");
    const match = /^bytes=(\d+)-(\d+)$/.exec(range ?? "");
    if (match === null) throw new Error(`Unexpected Range header: ${range}`);
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end >= bytes.byteLength) {
      throw new Error(`Unexpected byte request: ${range}`);
    }
    const body = bytes.slice(start, end + 1);
    return Promise.resolve(
      new Response(body, {
        status: 206,
        headers: { "Content-Range": `bytes ${start}-${end}/${bytes.byteLength}` },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestedRanges(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>): string[] {
  return fetchMock.mock.calls.map(([, init]) => new Headers(init?.headers).get("Range") ?? "");
}

describe("createBigBedFile", () => {
  it("returns the committed BED source records from compressed and uncompressed fixtures", async () => {
    expect(parseBbiHeader(fixture).uncompressBufferSize).toBeGreaterThan(0);
    expect(parseBbiHeader(uncompressedFixture).uncompressBufferSize).toBe(0);

    const observed: Array<Array<GenomicRecord & { fields: string[] }>> = [];

    for (const bytes of [fixture, uncompressedFixture]) {
      installFixtureFetch(bytes);
      const file = createBigBedFile({ url, schema: bed3Schema });
      observed.push([
        ...(await file.read({ chromosome: "chr1", start: 0, end: 100 })),
        ...(await file.read({ chromosome: "chr2", start: 0, end: 80 })),
      ]);
    }

    expect(observed).toEqual([sourceRecords, sourceRecords]);
  });

  it("reads the committed BED6 fixture through the schema-inferred public API", async () => {
    const fetchMock = installFixtureFetch();
    const file = createBigBedFile({ url, schema: bed3Schema });
    expectTypeOf(file).toMatchTypeOf<GenomicFile<GenomicRecord & { fields: string[] }>>();
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(file.read({ chromosome: "chr1", start: 0, end: 100 })).resolves.toEqual([
      { chromosome: "chr1", start: 10, end: 20, fields: ["alpha", "100", "+"] },
      { chromosome: "chr1", start: 20, end: 30, fields: ["boundary", "200", "-"] },
      { chromosome: "chr1", start: 25, end: 40, fields: ["overlap", "300", "+"] },
      { chromosome: "chr1", start: 25, end: 40, fields: ["duplicate-key", "350", "-"] },
      { chromosome: "chr1", start: 25, end: 40, fields: ["duplicate-key", "350", "-"] },
      { chromosome: "chr1", start: 90, end: 100, fields: ["chromosome-end", "400", "."] },
    ]);
    await expect(file.read({ chromosome: "chr1", start: 20, end: 25 })).resolves.toEqual([
      { chromosome: "chr1", start: 20, end: 30, fields: ["boundary", "200", "-"] },
    ]);
    await expect(file.read({ chromosome: "chr2", start: 0, end: 100 })).resolves.toEqual([
      { chromosome: "chr2", start: 0, end: 10, fields: ["chromosome-start", "500", "-"] },
      {
        chromosome: "chr2",
        start: 40,
        end: 60,
        fields: ["second-chromosome", "600", "+"],
      },
    ]);
    await expect(file.read({ chromosome: "missing", start: 0, end: 100 })).resolves.toEqual([]);
    await expect(file.read({ chromosome: "chr1", start: 40, end: 90 })).resolves.toEqual([]);
  });

  it("restarts from the header on every stateless read", async () => {
    const fetchMock = installFixtureFetch();
    const file = createBigBedFile({ url, schema: bed3Schema });
    const region = { chromosome: "chr1", start: 10, end: 20 };

    await file.read(region);
    const firstReadRanges = requestedRanges(fetchMock);
    fetchMock.mockClear();
    await file.read(region);

    expect(firstReadRanges[0]).toBe("bytes=0-63");
    expect(requestedRanges(fetchMock)).toEqual(firstReadRanges);
  });

  it("preserves a native cancellation reason through the public read API", async () => {
    const fetchMock = installFixtureFetch();
    const controller = new AbortController();
    const reason = new DOMException("cancelled", "AbortError");
    controller.abort(reason);

    const file = createBigBedFile({ url, schema: bed3Schema });
    await expect(
      file.read({ chromosome: "chr1", start: 0, end: 100 }, { signal: controller.signal }),
    ).rejects.toBe(reason);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps regular object properties positionally, infers coercions, and retains trailing fields", async () => {
    installFixtureFetch();
    const ccreStyleSchema = z.object({
      accession: z.string().transform((value) => value.toUpperCase()),
      score: z.coerce.number(),
    });
    const file = createBigBedFile({ url, schema: ccreStyleSchema });
    const records = await file.read({ chromosome: "chr1", start: 10, end: 11 });
    expectTypeOf(records).toEqualTypeOf<
      Array<GenomicRecord & z.output<typeof ccreStyleSchema> & { fields: string[] }>
    >();
    expect(records).toEqual([
      {
        chromosome: "chr1",
        start: 10,
        end: 20,
        accession: "ALPHA",
        score: 100,
        fields: ["+"],
      },
    ]);
    expect(Object.keys(records[0]!)).toEqual([
      "chromosome",
      "start",
      "end",
      "accession",
      "score",
      "fields",
    ]);
  });

  it("rejects too-few source fields with a Zod error", async () => {
    installFixtureFetch();
    const fourFieldSchema = z.object({
      name: z.string(),
      score: z.coerce.number(),
      strand: z.string(),
      absent: z.string().default("must not be invented"),
    });
    const incompatibleFile = createBigBedFile({ url, schema: fourFieldSchema });
    await expect(
      incompatibleFile.read({ chromosome: "chr1", start: 10, end: 11 }),
    ).rejects.toBeInstanceOf(z.ZodError);
  });

  it("awaits property transforms sequentially with inferred output", async () => {
    installFixtureFetch();
    const parseOrder: string[] = [];
    const asynchronousSchema = z.object({
      name: z.string().transform((value) =>
        Promise.resolve().then(() => {
          parseOrder.push("name");
          return value.toUpperCase();
        }),
      ),
      score: z.coerce.number().refine(async (value) => {
        await Promise.resolve();
        parseOrder.push("score");
        return value === 100;
      }),
    });
    const file = createBigBedFile({ url, schema: asynchronousSchema });
    const records = await file.read({ chromosome: "chr1", start: 10, end: 11 });

    expectTypeOf(records).toEqualTypeOf<
      Array<
        GenomicRecord & {
          [Key in keyof z.output<typeof asynchronousSchema>]: Awaited<
            z.output<typeof asynchronousSchema>[Key]
          >;
        } & { fields: string[] }
      >
    >();
    expect(records).toEqual([
      {
        chromosome: "chr1",
        start: 10,
        end: 20,
        name: "ALPHA",
        score: 100,
        fields: ["+"],
      },
    ]);
    expect(parseOrder).toEqual(["name", "score"]);
  });

  it("checks cancellation after each awaited property parse", async () => {
    installFixtureFetch();
    const controller = new AbortController();
    const reason = new DOMException("cancelled during schema parsing", "AbortError");
    const secondProperty = vi.fn((value: string) => value);
    const schema = z.object({
      name: z.string().transform(async (value) => {
        await Promise.resolve();
        controller.abort(reason);
        return value;
      }),
      score: z.string().transform(secondProperty),
    });

    const file = createBigBedFile({ url, schema });
    await expect(
      file.read({ chromosome: "chr1", start: 0, end: 100 }, { signal: controller.signal }),
    ).rejects.toBe(reason);
    expect(secondProperty).not.toHaveBeenCalled();
  });

  it("rejects invalid, reserved, integer-index-like, refined, and wrapped schemas synchronously", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(() => createBigBedFile({ url: "/relative.bb", schema: bed3Schema })).toThrow(TypeError);
    expect(() => createBigBedFile({ url, schema: {} as never })).toThrow(TypeError);
    expect(() =>
      createBigBedFile({
        url,
        schema: z.object({ chromosome: z.string() }) as never,
      }),
    ).toThrow("reserved field chromosome");
    expect(() =>
      createBigBedFile({
        url,
        schema: z.object({ name: z.string() }).refine(() => true) as never,
      }),
    ).toThrow("object-level refinements");
    expect(() =>
      createBigBedFile({
        url,
        schema: z.object({ name: z.string() }).transform((value) => value) as never,
      }),
    ).toThrow("plain Zod 4 object schema");
    for (const fieldName of ["0", "1", "4294967294"]) {
      expect(() =>
        createBigBedFile({
          url,
          schema: z.object({ [fieldName]: z.string() }),
        }),
      ).toThrow("integer-index-like");
    }
    expect(() =>
      createBigBedFile({
        url,
        schema: z.object({ field1: z.string(), "01": z.string(), "4294967295": z.string() }),
      }),
    ).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts strict objects and rejects loose or catchall object policies synchronously", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const strictSchema = z.strictObject({ name: z.string() });
    const looseSchema = z.looseObject({ name: z.string() });
    const catchallSchema = z.object({ name: z.string() }).catchall(z.string());

    expect(() => createBigBedFile({ url, schema: strictSchema })).not.toThrow();
    expect(() => createBigBedFile({ url, schema: looseSchema as never })).toThrow(
      "strip or strict unknown-key policy",
    );
    expect(() => createBigBedFile({ url, schema: catchallSchema as never })).toThrow(
      "strip or strict unknown-key policy",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts an explicit never catchall consistently with strict objects", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const schema = z.object({ name: z.string() }).catchall(z.never());

    expect(() => createBigBedFile({ url, schema })).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects wrapped never catchalls and symbol-keyed shapes synchronously", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const wrappedNever = z.object({ name: z.string() }).catchall(z.never().readonly());
    const symbolKey = Symbol("field");
    const symbolSchema = z.object({ name: z.string(), [symbolKey]: z.string() });

    expect(() => createBigBedFile({ url, schema: wrappedNever as never })).toThrow(
      "strip or strict unknown-key policy",
    );
    expect(() => createBigBedFile({ url, schema: symbolSchema as never })).toThrow(
      "string property names",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("decodes __proto__ as an ordered own property without changing prototypes", async () => {
    installFixtureFetch();
    const shape = Object.create(null) as Record<string, z.ZodType>;
    Object.defineProperty(shape, "__proto__", {
      enumerable: true,
      value: z.string().transform(async (value) => value.toUpperCase()),
    });
    Object.defineProperty(shape, "score", { enumerable: true, value: z.coerce.number() });
    const schema = z.object(shape);
    const file = createBigBedFile({ url, schema });

    const [record] = await file.read({ chromosome: "chr1", start: 10, end: 11 });

    expect(Object.getPrototypeOf(record)).toBe(Object.prototype);
    expect(Object.hasOwn(record!, "__proto__")).toBe(true);
    expect(record!["__proto__"]).toBe("ALPHA");
    expect(record).toMatchObject({
      chromosome: "chr1",
      start: 10,
      end: 20,
      score: 100,
      fields: ["+"],
    });
    expect(Object.keys(record!)).toEqual([
      "chromosome",
      "start",
      "end",
      "__proto__",
      "score",
      "fields",
    ]);
    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
  });

  it("rejects a non-BigBed container", async () => {
    const bigWig = fixture.slice();
    new DataView(bigWig.buffer, bigWig.byteOffset, bigWig.byteLength).setUint32(
      0,
      0x888ffc26,
      true,
    );
    installFixtureFetch(bigWig);
    const file = createBigBedFile({ url, schema: bed3Schema });
    await expect(file.read({ chromosome: "chr1", start: 0, end: 1 })).rejects.toThrow(
      "Expected a BigBed file",
    );
  });
});

function verifySchemaTypeRestrictions(): void {
  const reservedFieldSchema = z.object({ fields: z.string() });
  // @ts-expect-error protected record names cannot be declared by a custom schema
  createBigBedFile({ url, schema: reservedFieldSchema });

  const wrappedSchema = z.object({ label: z.string() }).transform((value) => value);
  // @ts-expect-error object-level schema wrappers are not supported
  createBigBedFile({ url, schema: wrappedSchema });

  const catchallSchema = z.object({ label: z.string() }).catchall(z.string());
  // @ts-expect-error catchall output index signatures are not supported
  createBigBedFile({ url, schema: catchallSchema });

  const looseSchema = z.looseObject({ label: z.string() });
  // @ts-expect-error loose output index signatures are not supported
  createBigBedFile({ url, schema: looseSchema });

  createBigBedFile({ url, schema: z.strictObject({ label: z.string() }) });
  createBigBedFile({ url, schema: z.object({ label: z.string() }).catchall(z.never()) });

  const wrappedNeverSchema = z.object({ label: z.string() }).catchall(z.never().readonly());
  // @ts-expect-error only an actual ZodNever catchall is supported
  createBigBedFile({ url, schema: wrappedNeverSchema });

  const symbolKey = Symbol("field");
  const symbolSchema = z.object({ label: z.string(), [symbolKey]: z.string() });
  // @ts-expect-error positional schemas support string keys only
  createBigBedFile({ url, schema: symbolSchema });
}

void verifySchemaTypeRestrictions;
