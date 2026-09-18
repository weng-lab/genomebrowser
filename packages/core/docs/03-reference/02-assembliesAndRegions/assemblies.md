# Assemblies

Use an assembly definition to specify the available chromosomes and their lengths. Import presets and `createAssemblyDefinition` from `@weng-lab/genomebrowser`.

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

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
