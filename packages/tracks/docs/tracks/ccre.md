# cCRE BigBed

`ccreBigBedModule` renders ENCODE candidate cis-regulatory elements from a BigBed file whose columns match the aggregate cCRE layout.

## Minimal track

```ts
import { ccreBigBedModule } from "@weng-lab/genomebrowser-tracks/ccre";

const track = ccreBigBedModule.create({
  id: "ccres",
  title: "cCREs",
  config: { url: "YOUR_URL_HERE" },
});
```

## Parsed columns

The module parses the seven columns after BED3 as `name`, numeric `score`, `strand`, numeric `thickStart`, numeric `thickEnd`, RGB `color`, and `ccreClass`. Schema property order is significant because BigBed records store these values positionally. Remaining columns stay in `fields`.

The module uses the same `dense` and `squish` displays, config options, defaults, and settings as BigBed. Its tooltip shows the cCRE accession beside a square using the record color, followed by the classification and genomic location. Its type value is `"ccre-bigbed"`, so it can be registered alongside the generic `bigBedModule`.

## Exported API

| Export                  | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `ccreBigBedModule`      | Ready-to-register cCRE module.                               |
| `ccreBigBedSchema`      | Ordered Zod schema used for columns after BED3.              |
| `CcreBigBedCreateInput` | Input accepted by `ccreBigBedModule.create`.                 |
| `CcreBigBedConfig`      | Parsed config containing `url` and `rowHeight`.              |
| `CcreBigBedRow`         | BigBed coordinates plus the parsed cCRE fields listed above. |
