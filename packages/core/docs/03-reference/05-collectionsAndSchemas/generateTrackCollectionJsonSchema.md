# generateTrackCollectionJsonSchema

Generate a JSON Schema for collections using the track modules supported by the application. Import this function from `@weng-lab/genomebrowser`.

## API

`generateTrackCollectionJsonSchema(modules: readonly AnyTrackModule[])` returns the JSON Schema object for collection **input**, using Zod's JSON Schema conversion. An empty module list or duplicate module types throws. Unsupported schema conversions can also throw.

```ts
import { generateTrackCollectionJsonSchema } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const jsonSchema = generateTrackCollectionJsonSchema([bigWigModule]);
const schemaText = JSON.stringify(jsonSchema, null, 2);
```

Use the generated schema for editor completion and structural validation. It does not replace the additional checks in [validateTrackCollection](validateTrackCollection.md). The function does not write files; use the [schema CLI](schemaCli.md) for file output.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
