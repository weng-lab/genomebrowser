import { describe, expect, expectTypeOf, it } from "vitest";
import {
  ce11,
  createAssemblyDefinition,
  dm6,
  hg38,
  mm10,
  tair10,
  type AssemblyDefinition,
} from "../../src/lib";

describe("createAssemblyDefinition", () => {
  it("creates a custom assembly definition", () => {
    const assembly = createAssemblyDefinition({
      id: "custom",
      chromosomes: { chrA: 100, ChrA: 50 },
    });

    expectTypeOf(assembly).toEqualTypeOf<AssemblyDefinition>();
    expect(assembly).toEqual({
      id: "custom",
      chromosomes: { chrA: 100, ChrA: 50 },
    });
  });

  it("preserves case-sensitive chromosome keys", () => {
    const assembly = createAssemblyDefinition({
      id: "case-sensitive",
      chromosomes: { chrI: 100 },
    });

    expect(assembly.chromosomes.chrI).toBe(100);
    expect(assembly.chromosomes.ChrI).toBeUndefined();
  });

  it.each([
    ["empty id", { id: "", chromosomes: { chr1: 1 } }, /id must be a non-empty string/],
    ["empty chromosome map", { id: "custom", chromosomes: {} }, /must not be empty/],
    ["empty chromosome name", { id: "custom", chromosomes: { "": 1 } }, /names must not be empty/],
    ["zero length", { id: "custom", chromosomes: { chr1: 0 } }, /positive safe integer/],
    ["negative length", { id: "custom", chromosomes: { chr1: -1 } }, /positive safe integer/],
    ["fractional length", { id: "custom", chromosomes: { chr1: 1.5 } }, /positive safe integer/],
    ["NaN length", { id: "custom", chromosomes: { chr1: Number.NaN } }, /positive safe integer/],
    [
      "infinite length",
      { id: "custom", chromosomes: { chr1: Number.POSITIVE_INFINITY } },
      /positive safe integer/,
    ],
    [
      "unsafe integer length",
      { id: "custom", chromosomes: { chr1: Number.MAX_SAFE_INTEGER + 1 } },
      /positive safe integer/,
    ],
  ])("rejects an invalid definition with %s", (_name, definition, message) => {
    expect(() => createAssemblyDefinition(definition)).toThrow(message);
  });

  it("does not attach lookup semantics to a built-in id", () => {
    const customHg38 = createAssemblyDefinition({
      id: "hg38",
      chromosomes: { customChromosome: 42 },
    });

    expect(customHg38.chromosomes).toEqual({ customChromosome: 42 });
    expect(customHg38.chromosomes.chr1).toBeUndefined();
  });

  it("snapshots and freezes definitions", () => {
    const chromosomes: Record<string, number> = { chr1: 100 };
    const input = { id: "custom", chromosomes };
    const assembly = createAssemblyDefinition(input);

    chromosomes.chr1 = 200;
    chromosomes.chr2 = 300;
    input.id = "changed";

    expect(assembly).toEqual({ id: "custom", chromosomes: { chr1: 100 } });
    expect(Object.isFrozen(assembly)).toBe(true);
    expect(Object.isFrozen(assembly.chromosomes)).toBe(true);
    expect(() => Object.assign(assembly.chromosomes, { chr1: 400 })).toThrow(TypeError);
  });

  it("snapshots only own chromosome keys into a prototype-free dictionary", () => {
    const chromosomes = Object.create({ inheritedChromosome: 200 }) as Record<string, number>;
    chromosomes.chr1 = 100;
    const assembly = createAssemblyDefinition({ id: "own-keys", chromosomes });

    expect(Object.getPrototypeOf(assembly.chromosomes)).toBeNull();
    expect(Object.keys(assembly.chromosomes)).toEqual(["chr1"]);
    expect(assembly.chromosomes.inheritedChromosome).toBeUndefined();
    expect(assembly.chromosomes.toString).toBeUndefined();
  });

  it("keeps prototype-related chromosome names as safe own keys", () => {
    const chromosomes = Object.create(null) as Record<string, number>;
    chromosomes.__proto__ = 25;
    Object.defineProperty(chromosomes, "constructor", {
      value: 50,
      enumerable: true,
      writable: true,
      configurable: true,
    });

    const assembly = createAssemblyDefinition({ id: "prototype-names", chromosomes });

    expect(Object.getPrototypeOf(assembly.chromosomes)).toBeNull();
    expect(Object.keys(assembly.chromosomes)).toEqual(["__proto__", "constructor"]);
    expect(assembly.chromosomes.__proto__).toBe(25);
    expect(assembly.chromosomes.constructor).toBe(50);
  });
});

describe("built-in assembly definitions", () => {
  it.each([
    [
      "hg38",
      hg38,
      [
        "chr1",
        "chr2",
        "chr3",
        "chr4",
        "chr5",
        "chr6",
        "chr7",
        "chr8",
        "chr9",
        "chr10",
        "chr11",
        "chr12",
        "chr13",
        "chr14",
        "chr15",
        "chr16",
        "chr17",
        "chr18",
        "chr19",
        "chr20",
        "chr21",
        "chr22",
        "chrX",
        "chrY",
        "chrM",
      ],
      "chr1",
      248956422,
    ],
    [
      "mm10",
      mm10,
      [
        "chr1",
        "chr2",
        "chr3",
        "chr4",
        "chr5",
        "chr6",
        "chr7",
        "chr8",
        "chr9",
        "chr10",
        "chr11",
        "chr12",
        "chr13",
        "chr14",
        "chr15",
        "chr16",
        "chr17",
        "chr18",
        "chr19",
        "chrX",
        "chrY",
        "chrM",
      ],
      "chr19",
      61431566,
    ],
    ["ce11", ce11, ["chrI", "chrII", "chrIII", "chrIV", "chrV", "chrX", "chrM"], "chrV", 20924180],
    [
      "dm6",
      dm6,
      ["chr2L", "chr2R", "chr3L", "chr3R", "chr4", "chrX", "chrY", "chrM"],
      "chr3R",
      32079331,
    ],
    ["tair10", tair10, ["Chr1", "Chr2", "Chr3", "Chr4", "Chr5", "ChrM", "ChrC"], "Chr5", 26975502],
  ] as const)(
    "exports the complete canonical key set and a representative bound for %s",
    (id, assembly, expectedKeys, chromosome, length) => {
      expect(assembly.id).toBe(id);
      expect(Object.keys(assembly.chromosomes)).toEqual(expectedKeys);
      expect(assembly.chromosomes[chromosome]).toBe(length);
      expect(Object.isFrozen(assembly)).toBe(true);
      expect(Object.isFrozen(assembly.chromosomes)).toBe(true);
    },
  );

  it("keeps preset chromosome names case-sensitive", () => {
    expect(ce11.chromosomes.chrI).toBe(15072434);
    expect(ce11.chromosomes.chri).toBeUndefined();
    expect(tair10.chromosomes.Chr1).toBe(30427671);
    expect(tair10.chromosomes.chr1).toBeUndefined();
  });
});
