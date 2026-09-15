# BED schema examples

Use `bed9` for files whose color is stored in the ninth BED column. Use `ccre` when a tenth column contains the cCRE classification. These examples use mouse sources already used by SCREEN. Register `bigBedModule` and `bulkBedModule` with the browser's track store.

## Choose sources

The examples below share these imports and URLs:

```ts
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";

const chromHmmForebrain = "https://downloads.wenglab.org/Registry-V4/ENCFF330GHF.bigBed";
const chromHmmForebrainLater = "https://downloads.wenglab.org/Registry-V4/ENCFF739VQW.bigBed";
const ccreAggregate = "https://downloads.wenglab.org/mm10-cCREs.DCC.bigBed";
const ccreAdipose = "https://downloads.wenglab.org/Registry-V4/ENCFF409WOB_ENCFF476CKA.bigBed";
```

## Display one source per track

The ChromHMM file uses BED9 colors for chromatin states. The aggregate cCRE file adds a classification column, so it uses `bedSchema: "ccre"`:

```ts
const chromHmm = bigBedModule.create({
  base: {
    id: "mouse-chromhmm",
    title: "Mouse forebrain ChromHMM",
  },
  config: { url: chromHmmForebrain, bedSchema: "bed9" },
});

const ccres = bigBedModule.create({
  base: {
    id: "mouse-ccres",
    title: "Mouse aggregate cCREs",
  },
  config: { url: ccreAggregate, bedSchema: "ccre" },
});
```

Both tracks use the general BigBed renderer and tooltip. To display the cCRE classification in the tooltip, use the [cCRE module](../reference/trackModules/ccre.md).

## Compare sources within one track

BulkBed assigns one row to each dataset with features in the visible viewport. The names label the datasets in tooltips. Each track applies one schema to every source, so the ChromHMM and cCRE comparisons are separate tracks:

```ts
const bulkChromHmm = bulkBedModule.create({
  base: {
    id: "mouse-chromhmm-comparison",
    title: "Mouse forebrain ChromHMM comparison",
  },
  config: {
    bedSchema: "bed9",
    datasets: [
      { name: "Forebrain E11.5", url: chromHmmForebrain },
      { name: "Forebrain E12.5", url: chromHmmForebrainLater },
    ],
  },
});

const bulkCcres = bulkBedModule.create({
  base: {
    id: "mouse-ccre-comparison",
    title: "Mouse cCRE comparison",
  },
  config: {
    bedSchema: "ccre",
    datasets: [
      { name: "Aggregate", url: ccreAggregate },
      { name: "Brown adipose tissue", url: ccreAdipose },
    ],
  },
});
```

Add these instances to the track store's `tracks` array. The [BED schema reference](../reference/dataPrimitives/bedSchemas.md) covers column validation, colors, and additional fields.

Return to [Guides and release history](README.md) or [Tracks documentation](../README.md).
