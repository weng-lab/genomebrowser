# Assemblies and regions

An assembly definition tells the browser which chromosomes it can display and how long they are. A genomic region identifies the interval to display on one chromosome. This reference covers the built-in definitions, custom assemblies, and the functions for parsing and validating regions.

## Coordinates

`GenomicRegion` is `{ chromosome: string; start: number; end: number }`. Coordinates are **zero-based and half-open**: `{ chromosome: "chr1", start: 0, end: 1 }` selects the first base, and interval width is `end - start`. Parsing a string uses the same convention; it does not subtract one from the start.

A sequence name identifies a chromosome or another assembled piece of DNA, such as a contig or scaffold. It is the key in the assembly’s `chromosomes` map and the value of a region’s `chromosome` field. For example, `chr1` and `Chr1` are different names; use the spelling found in both your assembly definition and data source.

## Built-in assemblies

The library provides these pre-built assembly definitions. Pass one as the `assembly` option when creating a browser store. Each includes the main nuclear chromosomes and organelle sequences; use a custom definition for additional contigs or alternate loci.

| Export   | Sequence keys                                                      |
| -------- | ------------------------------------------------------------------ |
| `hg38`   | `chr1`–`chr22`, `chrX`, `chrY`, `chrM`                             |
| `mm10`   | `chr1`–`chr19`, `chrX`, `chrY`, `chrM`                             |
| `ce11`   | `chrI`–`chrV`, `chrX`, `chrM`                                      |
| `dm6`    | `chr2L`, `chr2R`, `chr3L`, `chr3R`, `chr4`, `chrX`, `chrY`, `chrM` |
| `tair10` | `Chr1`–`Chr5`, `ChrM`, `ChrC`                                      |

Each preset is an immutable `AssemblyDefinition`; its `chromosomes` map contains the sequence lengths. To use additional or differently named sequences, create your own definition with `createAssemblyDefinition` below.

## createAssemblyDefinition

Use this function to define a custom assembly from chromosome or contig lengths. It validates the definition and returns an immutable copy that can be passed to a browser store.

```ts
import { createAssemblyDefinition, createBrowserStore } from "@weng-lab/genomebrowser";

const customAssembly = createAssemblyDefinition({
  id: "my-reference",
  chromosomes: { contigA: 125_000, "scaffold-2": 48_500 },
});

const useBrowserStore = createBrowserStore({
  assembly: customAssembly,
  region: { chromosome: "contigA", start: 0, end: 10_000 },
});
```

`createAssemblyDefinition(definition: AssemblyDefinition): AssemblyDefinition` validates the input, copies the sequence map, and freezes both the returned definition and its map. Changing the input afterward does not affect the snapshot.

### AssemblyDefinition

| Field         | Type                               | Required | Description                                                                                                  |
| ------------- | ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `id`          | `string`                           | Yes      | Non-empty assembly identifier. It does not register the definition globally or inherit a preset's sequences. |
| `chromosomes` | `Readonly<Record<string, number>>` | Yes      | Non-empty map of non-empty sequence names to positive safe-integer lengths.                                  |

The factory throws an `Error` for an invalid definition. Sequence names may include punctuation or whitespace; for names the string parser cannot represent, construct a region object directly.

You may pass an `AssemblyDefinition` object directly to `createBrowserStore`, which performs the same validation and snapshot. The store's assembly is fixed for its lifetime; create a new store to use another assembly. A custom definition can reuse a preset ID without inheriting its bounds.

## parseRegion

`parseRegion(input: string): GenomicRegion` parses either `chromosome:start-end` or exactly three whitespace-delimited fields:

```ts
import { parseRegion } from "@weng-lab/genomebrowser";

const locus = parseRegion("chr12:53,372,922-53,423,700");
const fields = parseRegion("  chr12\t53372922\t53423700  ");
// Both produce { chromosome: "chr12", start: 53372922, end: 53423700 }.
```

The parser trims surrounding whitespace, permits whitespace around `:` and `-`, and accepts signed integers with optional correctly grouped thousands separators. It preserves sequence-name case. Decimal coordinates, malformed comma groups, extra fields, and mixed syntax throw an `Error`; non-string input also throws.

Parsing checks text structure only. It does not validate safe-integer range, ordering, assembly membership, or bounds, and does not clamp. A successfully parsed region can still be invalid. Pass the result to `normalizeRegion` or the browser store's `setRegion` before using it as a viewport.

## normalizeRegion

`normalizeRegion(region: GenomicRegion, assembly: AssemblyDefinition): RegionResult` validates a region and intersects it with its chromosome bounds without mutating either argument. Pass a valid assembly definition, such as a preset or a result from `createAssemblyDefinition`; this function does not validate the assembly itself.

```ts
import { createAssemblyDefinition, normalizeRegion } from "@weng-lab/genomebrowser";

const assembly = createAssemblyDefinition({ id: "example", chromosomes: { contigA: 100 } });
const result = normalizeRegion({ chromosome: "contigA", start: -10, end: 20 }, assembly);
// { ok: true, region: { chromosome: "contigA", start: 0, end: 20 }, clamped: true }
```

A partial overlap is intersected with `[0, chromosomeLength)`. The interval can become shorter; it is not shifted to preserve its width. An interval entirely outside the chromosome is rejected.

### RegionResult and RegionErrorCode

`RegionResult` is a discriminated union:

```ts
import type { GenomicRegion, RegionErrorCode } from "@weng-lab/genomebrowser";

type Result =
  | { ok: true; region: GenomicRegion; clamped: boolean }
  | { ok: false; code: RegionErrorCode; error: string };
```

On success, `region` is the validated interval and `clamped` indicates whether either bound changed. On failure, `error` explains the rejected input and `code` identifies its category:

| Code                 | Cause                                                                |
| -------------------- | -------------------------------------------------------------------- |
| `INVALID_REGION`     | Input is not a region object or lacks a non-empty chromosome string. |
| `INVALID_COORDINATE` | Either coordinate is not a finite safe integer.                      |
| `REVERSED_REGION`    | Start is greater than end.                                           |
| `ZERO_WIDTH_REGION`  | Start equals end.                                                    |
| `UNKNOWN_CHROMOSOME` | The exact sequence key is absent from the assembly.                  |
| `OUTSIDE_CHROMOSOME` | The interval has no overlap with the chromosome bounds.              |

Validation checks object shape, coordinates, ordering, membership, then overlap. Expected invalid-region inputs return a failure result rather than throwing. To commit a region to a browser, see [browser-store navigation](browserStore.md#navigation).
