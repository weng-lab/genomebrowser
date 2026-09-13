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

Place markers on fields inside `configSchema`; `defineTrackModule` creates a strict copy of the root object schema. Core traverses object properties and array elements to find marked schemas. A marker on an object or array includes its entire value. Apply markers outside wrappers such as optional/default schemas, as in `fetchOnChange(z.string().optional())`; the traversal does not descend through every Zod wrapper. The marker does not issue requests by itself; the mounted browser observes committed track changes.

Changes are compared using marked parsed config values. Supplying an equivalent marked value does not by itself require another fetch. Rendering-only configuration can stay unmarked, but every value that changes the fetched result needs a marker. See [request timing](fetchingData.md#requests-and-result-lifetime) for width changes and result reuse.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
