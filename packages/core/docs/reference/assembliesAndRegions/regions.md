# Regions

Use `parseRegion` to read text and `normalizeRegion` to validate a region against an assembly. Both use the same coordinate convention as the browser.

## Coordinates

`GenomicRegion` is `{ chromosome: string; start: number; end: number }`. Coordinates are **zero-based and half-open**: `{ chromosome: "chr1", start: 0, end: 1 }` selects the first base, and region width is `end - start`. Parsing a string uses the same convention; it does not subtract one from the start.

A sequence name identifies a chromosome or another assembled piece of DNA, such as a contig or scaffold. It is the key in the assembly's `chromosomes` map and the value of a region's `chromosome` field. For example, `chr1` and `Chr1` are different names; use the spelling found in both your assembly definition and data source.

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

A partial overlap is intersected with `[0, chromosomeLength)`. The region can become shorter; it is not shifted to preserve its width. A region entirely outside the chromosome is rejected.

### RegionResult and RegionErrorCode

`RegionResult` is a discriminated union:

```ts
import type { GenomicRegion, RegionErrorCode } from "@weng-lab/genomebrowser";

type Result =
  | { ok: true; region: GenomicRegion; clamped: boolean }
  | { ok: false; code: RegionErrorCode; error: string };
```

On success, `region` is the validated region and `clamped` indicates whether either bound changed. On failure, `error` explains the rejected input and `code` identifies its category:

| Code                 | Cause                                                                |
| -------------------- | -------------------------------------------------------------------- |
| `INVALID_REGION`     | Input is not a region object or lacks a non-empty chromosome string. |
| `INVALID_COORDINATE` | Either coordinate is not a finite safe integer.                      |
| `REVERSED_REGION`    | Start is greater than end.                                           |
| `ZERO_WIDTH_REGION`  | Start equals end.                                                    |
| `UNKNOWN_CHROMOSOME` | The exact sequence key is absent from the assembly.                  |
| `OUTSIDE_CHROMOSOME` | The region has no overlap with the chromosome bounds.                |

Validation checks object shape, coordinates, ordering, membership, then overlap. Expected invalid-region inputs return a failure result rather than throwing. To commit a region to a browser, see [browser-store navigation](../browserSetup/browserStore.md#navigation).

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
