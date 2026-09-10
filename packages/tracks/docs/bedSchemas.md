# BED schemas and colored tracks

BigBed and BulkBed accept a serializable `config.bedSchema` key. Omission means `"bed9"`. BulkBed applies the same schema to every dataset.

Parsing is strict: missing required columns or values that fail the selected schema cause a fetch error. There is no automatic detection or fallback. Set `bedSchema` to match your files, such as `"bed3"` for coordinate-only data.
Changing the key requests data again using the selected schema. BulkBed applies one schema to every dataset in the track; group datasets with different column layouts into separate tracks.

| Key    | Parsed columns after chromosome, start, and end      |
| ------ | ---------------------------------------------------- |
| `bed3` | None                                                 |
| `bed4` | name                                                 |
| `bed5` | name, score                                          |
| `bed6` | name, score, strand                                  |
| `bed9` | name, score, strand, thickStart, thickEnd, color     |
| `ccre` | BED9 columns followed by ccreClass (Registry BED9+1) |

Score and thick coordinates become numbers. BED9's RGB column becomes a CSS `rgb(...)` color; `0` becomes black. Invalid RGB triples fail parsing. Select a schema matching the source columns: BED5 has a score, while BED9 has an explicit color. Columns beyond the chosen schema remain in `fields`. The schema controls parsing; it does not add thick-region or block rendering.

Both renderers use the parsed color for each interval, with the track color as fallback when no color is parsed. Dense rendering may merge adjacent or overlapping intervals of the same color. Names and scores become available to tooltips and callbacks. The generic tracks retain their generic tooltips; use the cCRE module when you want its specialized tooltip.

## Mouse ChromHMM and cCRE examples

These are existing mouse sources used by SCREEN. Register `bigBedModule` and `bulkBedModule` with your browser's track store. Each BigBed track shows one source; each BulkBed track shows a row per dataset.

```ts
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";

const chromHmmForebrain = "https://downloads.wenglab.org/Registry-V4/ENCFF330GHF.bigBed";
const chromHmmForebrainLater = "https://downloads.wenglab.org/Registry-V4/ENCFF739VQW.bigBed";
const ccreAggregate = "https://downloads.wenglab.org/mm10-cCREs.DCC.bigBed";
const ccreAdipose = "https://downloads.wenglab.org/Registry-V4/ENCFF409WOB_ENCFF476CKA.bigBed";

const chromHmm = bigBedModule.create({
  id: "mouse-chromhmm",
  title: "Mouse forebrain ChromHMM",
  config: { url: chromHmmForebrain, bedSchema: "bed9" },
});

const ccres = bigBedModule.create({
  id: "mouse-ccres",
  title: "Mouse aggregate cCREs",
  config: { url: ccreAggregate, bedSchema: "ccre" },
});

const bulkChromHmm = bulkBedModule.create({
  id: "mouse-chromhmm-comparison",
  title: "Mouse forebrain ChromHMM comparison",
  config: {
    bedSchema: "bed9",
    datasets: [
      { name: "Forebrain E11.5", url: chromHmmForebrain },
      { name: "Forebrain E12.5", url: chromHmmForebrainLater },
    ],
  },
});

const bulkCcres = bulkBedModule.create({
  id: "mouse-ccre-comparison",
  title: "Mouse cCRE comparison",
  config: {
    bedSchema: "ccre",
    datasets: [
      { name: "Aggregate", url: ccreAggregate },
      { name: "Brown adipose tissue", url: ccreAdipose },
    ],
  },
});
```

## Reuse the schemas

```ts
import { createBigBedFile } from "@weng-lab/genomic-reader";
import {
  bedSchemas,
  bedSchemaKeys,
  type BedSchemaKey,
} from "@weng-lab/genomebrowser-tracks/shared";

const key: BedSchemaKey = "bed9";
const file = createBigBedFile({ url: "YOUR_URL_HERE", schema: bedSchemas[key] });
```

`bedSchemaKeys` lists supported keys, and `bedSchemaKeySchema` is their Zod enum for validating configuration. Custom Zod schemas can still be used in custom module fetchers; they are not accepted as keys in these first-party tracks.
