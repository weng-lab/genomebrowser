# fetchOnChange

`fetchOnChange<Schema extends z.core.$ZodType>(schema: Schema): Schema` marks a configuration schema whose value affects fetching or fetch-time processing. It returns the same schema object without changing its parsing rules.

## Usage

```ts
import { z } from "zod";
import { fetchOnChange } from "@weng-lab/genomebrowser";

const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  threshold: z.number().default(0),
});
```

Here, changing `url` requests data again. A threshold used only while rendering can remain unmarked. Mark every value read by the fetcher or its processing logic. Region, assembly, display, and render-width changes also cause requests independently of these markers.

## Marker placement

Place markers on fields inside `configSchema`. Apply them outside optional or default wrappers, as in `fetchOnChange(z.string().optional())`. A marker on an object or array includes its entire value.

Core searches object properties and array elements for markers, but does not search through every Zod wrapper. Mark fields rather than the root config object, since `defineTrackModule` makes a strict copy of that object schema.

The marker does not issue requests. The mounted browser checks marked values when track changes are committed.

Core compares the parsed values of marked fields. Supplying an equivalent value does not require another fetch. Fields used only while rendering can stay unmarked. See [request timing](fetchingData.md#requests-and-result-lifetime) for width changes and result reuse.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
