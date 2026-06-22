# BigBed Track

`bigBedModule` renders genomic intervals from a BigBed file.

## Config

```ts
const track = bigBedModule.create({
  id: "peaks",
  title: "Peaks",
  url: "YOUR_URL_HERE",
});
```

Fields:

- `url`: BigBed URL, required

Display modes:

- `dense`
- `squish`

Defaults:

- `height`: `60`
- `color`: `#4b9560`
- `display`: `dense`

## Row Schemas

The built-in `bigbed` module is the generic interval track. Its config does not accept a row schema. Schema-specific parsing belongs in a custom BigBed-derived module because the schema determines the tooltip and interaction item type.

When a BigBed file has meaningful extra columns, define a custom module with its own `type`, capture the row schema in that module's fetch function, and reuse the BigBed fetch helper/renderers:

```tsx
import { z } from "zod";
import {
  DenseBigBed,
  defineTrackModule,
  fetchBigBedRows,
  fetchOnChange,
  SquishBigBed,
  type InferBigBedRow,
} from "@weng-lab/genomebrowser-v2";

const peakSchema = z.object({
  chrom: z.string(),
  start: z.coerce.number(),
  end: z.coerce.number(),
  name: z.string(),
  score: z.coerce.number(),
  strand: z.string(),
  signalValue: z.coerce.number(),
});

type PeakRow = InferBigBedRow<typeof peakSchema>;

function PeakTooltip({ item }: { item: PeakRow }) {
  return (
    <g>
      <rect width={160} height={28} fill="#ffffff" stroke="#cccccc" />
      <text x={8} y={18} fill="#000000" fontSize={12}>
        {item.name}: {item.signalValue}
      </text>
    </g>
  );
}

export const peakModule = defineTrackModule<PeakRow>()({
  type: "peaks",
  defaults: {
    height: 60,
    color: "#4b9560",
  },
  configSchema: z.object({
    url: fetchOnChange(z.string().min(1)),
  }),
  fetch: ({ config, region }) =>
    fetchBigBedRows({
      url: config.url,
      region,
      schema: peakSchema,
    }),
  render: {
    dense: DenseBigBed,
    squish: SquishBigBed,
  },
  tooltipComponent: PeakTooltip,
});
```

Use `InferBigBedRow<typeof schema>` for the parsed row type passed to `defineTrackModule` when the renderer exposes parsed BigBed rows directly. That generic types tooltip props and interaction callbacks such as `onClick`, `onHover`, and `onLeave`. If the renderer wraps or transforms the parsed row before exposing it, pass that transformed item type instead.

Schema key order maps to BigBed column order, including coordinate fields. Use `z.coerce.number()` for numeric columns because BigBed extra fields may be read as strings.

## Fetch Behavior

Changing `url` triggers a refetch. For custom BigBed-derived modules, the row schema is captured by the module fetch function instead of stored on each track config.
