# Track collections

A collection describes configured tracks for one assembly. Use it to load tracks from JSON or to offer a catalog through collection UI. Core provides the types, validation, and schema generation; the application decides which tracks to activate.

## Usage

Validate parsed JSON or a JavaScript object against the modules your application supports:

```ts
import { validateJson } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const modules = [bigWigModule];
const collection = validateJson(
  {
    assembly: "hg38",
    id: "signals",
    tracks: [
      {
        type: "bigwig",
        base: { id: "signal", title: "Signal" },
        config: { url: "YOUR_URL_HERE" },
      },
    ],
  },
  modules,
);
```

This does not add tracks to a browser. Convert entries through their modules' `create` methods, then use a [track-store action](trackStore.md). Collection entries contain creation input, so defaults and config transformations must be applied when creating instances.

## TrackCollection

| Field         | Type                     | Default  | Description                                                                                                                      |
| ------------- | ------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `$schema`     | `string`                 | Omitted  | Non-empty schema reference for JSON editors. Core preserves it without fetching the schema.                                      |
| `assembly`    | `string`                 | Required | Non-empty assembly identifier. Core preserves its exact spelling; the application decides whether it matches the active browser. |
| `id`          | `string`                 | Required | Non-empty collection identifier. Applications combining collections must ensure unique IDs.                                      |
| `label`       | `string`                 | Omitted  | Optional non-empty display name.                                                                                                 |
| `description` | `string`                 | Omitted  | Optional non-empty descriptive text.                                                                                             |
| `views`       | Array of view inputs     | Omitted  | If supplied, at least one view. View input may omit `grouping` and `leaf`.                                                       |
| `tracks`      | `TrackCollectionTrack[]` | Required | Authored entries in collection order. May be empty; track IDs must be unique within a validated collection.                      |

A collection does not contain chromosome lengths, viewport state, highlights, or selection mode. Its assembly ID does not perform preset lookup or alias matching. Use separate collections for different assemblies. Objects reject unknown collection-level fields.

## TrackCollectionTrack and TrackCollectionEntry

`TrackCollectionTrack` describes an authored entry. It is `Omit<TrackCollectionEntry, "source">`.

| Field      | Type                      | Default  | Description                                                                                                                                 |
| ---------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`     | `string`                  | Required | Registered module type.                                                                                                                     |
| `base`     | `TrackBaseInput`          | Required | Required ID and title, plus optional display, height, and color. See [creation input](trackModules.md#trackcreateinput-and-trackbaseinput). |
| `config`   | `Record<string, unknown>` | Required | Input validated by the selected module's config schema.                                                                                     |
| `metadata` | `TrackMetadata`           | Omitted  | Scalar attributes used to describe and organize tracks.                                                                                     |

`TrackCollectionEntry` is the broader exported type `TrackCreateInput<Record<string, unknown>> & { type: string; metadata?: TrackMetadata }`. It can describe an optional runtime source policy. Portable collection schemas deliberately omit that `source` field and reject it in collection JSON. Collection entries also reject interaction callbacks; attach those in application code during module creation.

To serialize runtime tracks as a collection, select `type`, `base`, and serializable `config` values. Keep desired metadata separately. Resolved values preserve the current settings on a later load; do not include runtime callbacks or source ownership policy.

### TrackMetadata

`TrackMetadata` is `Record<string, string | number | boolean | null>`. Values cannot be arrays or nested objects. Metadata stays separate from module config and runtime interaction context.

The built-in view fields are `id`, `title`, and `type`. All other referenced fields must exist in every track's metadata. Avoid using those built-in names as metadata keys because collection UI treats them as built-in values.

## Views and columns

Views describe ways a collection UI can organize tracks. Core validates their structure and field references; rendering and selection behavior belong to the UI consuming them.

### TrackCollectionView and TrackCollectionViewSchema

`TrackCollectionViewSchema` is an exported strict Zod schema for one view. Its parsed output type is `TrackCollectionView`.

| Field         | Type                      | Default   | Description                                                  |
| ------------- | ------------------------- | --------- | ------------------------------------------------------------ |
| `id`          | `string`                  | Required  | Non-empty view ID, unique within the collection.             |
| `label`       | `string`                  | Required  | Non-empty display name.                                      |
| `description` | `string`                  | Omitted   | Optional non-empty descriptive text.                         |
| `columns`     | `TrackCollectionColumn[]` | Required  | Non-empty list of available fields.                          |
| `grouping`    | `string[]`                | `[]`      | Non-empty field names in outermost-to-innermost group order. |
| `leaf`        | `string`                  | `"title"` | Non-empty field name used to label a final track item.       |

Parsing a view alone applies defaults and checks structure. It cannot check ID uniqueness across views or whether a metadata field exists on collection tracks. Use `validateJson` for those checks.

### TrackCollectionColumn

| Field         | Type      | Default  | Description                                         |
| ------------- | --------- | -------- | --------------------------------------------------- |
| `field`       | `string`  | Required | Non-empty built-in field or metadata key.           |
| `label`       | `string`  | Omitted  | Optional non-empty column label.                    |
| `description` | `string`  | Omitted  | Optional non-empty column description.              |
| `width`       | `number`  | Omitted  | Positive finite preferred column width.             |
| `hidden`      | `boolean` | Omitted  | Initial visibility preference for the consuming UI. |

These are schema defaults. Label fallbacks, column sizing, and visibility behavior depend on the UI component.

## validateJson

`validateJson(input: unknown, modules: readonly AnyTrackModule[]): TrackCollection` accepts an object, not a JSON string. If loading a string, parse it with `JSON.parse` first and handle parsing failures separately.

Validation checks the collection structure, each module's creation schema, duplicate track and view IDs, and every field referenced by columns, grouping, and leaf labels. It throws an `Error` containing validation details on failure. An empty module list or duplicate module types also throws.

The result applies collection/view defaults but retains the original authored track entries. This ensures module creation applies track defaults and transformations once. Those entries are not detached copies; treat validated input as data and create instances before use. `validateJson` does not add views or infer assembly compatibility.

## createTrackCollectionSchema

`createTrackCollectionSchema(modules: readonly AnyTrackModule[])` returns a Zod collection schema with a discriminated union of entries selected by `type`. Each entry uses its module's creation schema, omits source ownership, and adds metadata. Empty module lists and duplicate types throw.

```ts
import { createTrackCollectionSchema } from "@weng-lab/genomebrowser";

const schema = createTrackCollectionSchema(modules);
const parsed = schema.safeParse(collection);
if (!parsed.success) console.error(parsed.error.issues);
```

Unlike `validateJson`, parsing this schema returns parsed track values with module defaults and transformations applied. It checks shape, not duplicate IDs or references between views and metadata. Do not pass already-transformed config through creation again unless the schema supports doing so.

## generateTrackCollectionJsonSchema

`generateTrackCollectionJsonSchema(modules: readonly AnyTrackModule[])` returns the JSON Schema object for collection **input**, using Zod's JSON Schema conversion. It accepts the same module list as the Zod factory and can throw for unsupported schema conversions.

```ts
import { generateTrackCollectionJsonSchema } from "@weng-lab/genomebrowser";

const jsonSchema = generateTrackCollectionJsonSchema(modules);
const schemaText = JSON.stringify(jsonSchema, null, 2);
```

Use the generated schema for editor completion and structural validation. It does not replace the additional checks in `validateJson`. The function does not write files; use the CLI below for file output.

## Schema CLI

The package provides the `genomebrowser schema` command. Point it at a JavaScript or TypeScript module that exports your supported track module or array:

```ts
// trackModules.ts
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
export const trackModules = [bigWigModule];
```

```sh
pnpm exec genomebrowser schema --from ./trackModules.ts#trackModules --out ./trackCollection.schema.json
pnpm exec genomebrowser schema --from ./trackModules.ts#trackModules --out ./trackCollection.schema.json --check
```

| Option               | Default                       | Behavior                                                                                                                                              |
| -------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--from <source>`    | Required                      | Import a module or non-empty module array. Repeat to combine sources.                                                                                 |
| `--out <file>`, `-o` | `trackCollection.schema.json` | Write formatted JSON with a trailing newline. `-` writes to stdout. Parent directories are created.                                                   |
| `--id <uri>`         | Omitted                       | Add a JSON Schema `$id`. Must be non-empty; the CLI does not validate URI syntax.                                                                     |
| `--check`            | `false`                       | Compare the generated text with an existing file and fail if missing, unreadable, or different. Does not write it. Cannot be combined with `--out -`. |
| `--help`, `-h`       | `false`                       | Print usage. Running without a command also prints usage.                                                                                             |

Sources can be package specifiers or local relative/absolute paths. Relative paths and output files resolve from the working directory. Append `#exportName` to select a named export. Without it, the loader accepts a module value, a suitable default export, or the only suitable named export; ambiguous named exports require explicit selection. Duplicate module types across combined sources fail schema generation.

Importing a source executes its code in Node. Keep module definitions importable without application startup or browser-only side effects. Import, argument, generation, and file errors are reported on stderr with exit code 1. With stdout output, the loaded-module summary goes to stderr so stdout contains only the schema.

Set `$schema` in your collection JSON to the generated file's relative location. This helps an editor interpret the file; runtime validation still uses your supplied modules.
