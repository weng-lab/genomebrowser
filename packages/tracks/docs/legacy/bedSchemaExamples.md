# BED schema examples

These are existing mouse sources used by SCREEN. Register `bigBedModule` and `bulkBedModule` with your browser's track store. Each BigBed track shows one source; each BulkBed track shows a row per dataset.

```ts
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";

const chromHmmForebrain = "https://downloads.wenglab.org/Registry-V4/ENCFF330GHF.bigBed";
const chromHmmForebrainLater = "https://downloads.wenglab.org/Registry-V4/ENCFF739VQW.bigBed";
const ccreAggregate = "https://downloads.wenglab.org/mm10-cCREs.DCC.bigBed";
const ccreAdipose = "https://downloads.wenglab.org/Registry-V4/ENCFF409WOB_ENCFF476CKA.bigBed";

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

Return to [Legacy guides](README.md) or [API reference](../reference/README.md).
