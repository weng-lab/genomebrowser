# cCRE BigBed

Use `ccreBigBedModule` for ENCODE candidate cis-regulatory elements stored in the aggregate cCRE BigBed layout. It expects a browser-accessible BigBed URL with the cCRE columns described below. The example creates a cCRE track from that source.

## Minimal track

```ts
import { ccreBigBedModule } from "@weng-lab/genomebrowser-tracks/ccre";

const track = ccreBigBedModule.create({
  id: "ccres",
  title: "cCREs",
  config: { url: "YOUR_URL_HERE" },
});
```

## Inherited BigBed behavior

The cCRE module inherits the generic [BigBed](bigbed.md) renderer, `dense` and `squish` displays, base defaults, `url` and `rowHeight` config, row layout, source requirements, settings panel, and pointer interactions. Follow the BigBed source requirements, including CORS and byte-range support.

The module has its own type value, `"ccre-bigbed"`, so you can register it alongside `bigBedModule`.

## cCRE-specific parsing and tooltip

The module parses the seven columns after BED3 as `name`, numeric `score`, `strand`, numeric `thickStart`, numeric `thickEnd`, RGB `color`, and `ccreClass`. Schema property order matters because BigBed stores these values by position. Remaining columns stay in `fields`.

The cCRE tooltip shows the accession beside a square in the record color. It then shows the classification and genomic location.

## Exported API

| Export                  | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `ccreBigBedModule`      | Ready-to-register cCRE module.                               |
| `ccreBigBedSchema`      | Ordered Zod schema used for columns after BED3.              |
| `CcreBigBedCreateInput` | Input accepted by `ccreBigBedModule.create`.                 |
| `CcreBigBedConfig`      | Parsed config containing `url` and `rowHeight`.              |
| `CcreBigBedRow`         | BigBed coordinates plus the parsed cCRE fields listed above. |
