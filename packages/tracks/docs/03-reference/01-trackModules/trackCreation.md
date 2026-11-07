# Create and validate tracks

Every first-party module has the same creation methods. Import the module from its track subpath and pass the resulting instance to core's track store. Registration makes the type available; it does not create a track.

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const track = bigWigModule.create({
  base: { id: "signal", title: "Signal" },
  config: { url: "YOUR_URL_HERE" },
});
const useTrackStore = createTrackStore({ modules: [bigWigModule], tracks: [track] });
```

Use [firstPartyTrackModules](../02-collectionsAndSchemas/firstPartyTrackModules.md) to register every built-in type. For a complete browser setup, see [Use first-party tracks](../../01-gettingStarted/01-useTracks.md).

## Creation input

`module.create(input, interaction?)` validates input, applies defaults, and returns an instance with the module's `type`. Creation does not fetch data. Each module exports a `CreateInput` type for authored values and a `Config` type for config with defaults applied, such as `BigWigCreateInput` and `BigWigConfig`.

| Input          | Type                 | Default        | Description                                                                                                                                                           |
| -------------- | -------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base.id`      | `string`             | Required       | Non-empty ID, unique within the track store.                                                                                                                          |
| `base.title`   | `string`             | Required       | Non-empty display title.                                                                                                                                              |
| `base.display` | Module display name  | Module default | Selects one of the module's renderers.                                                                                                                                |
| `base.height`  | `number`             | Module default | Positive finite height in logical SVG units. Some renderers calculate height from their content.                                                                      |
| `base.color`   | `string`             | Module default | Six-digit `#RRGGBB` color, accepting either letter case.                                                                                                              |
| `config`       | Module config input  | Required       | Source and rendering options listed in the module's reference.                                                                                                        |
| `source`       | `"user"` or `"host"` | `"user"`       | Identifies whether the user or application controls the source. Built-in forms restrict source editing for host-owned tracks as described in each module's reference. |

The returned instance contains `type`, resolved `base`, parsed `config`, `source`, and optional `interaction`. Pass callbacks as the separate second argument to `create`. They remain runtime behavior rather than serialized config. Each module's reference describes supported events and callback items.

## Validate external input

Use `module.configSchema` for config alone or `module.createInputSchema` for the complete creation input. Both are Zod schemas with `parse` and `safeParse` methods:

```ts
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const result = bigWigModule.createInputSchema.safeParse({
  base: { id: "signal", title: "Signal" },
  config: { url: "YOUR_URL_HERE" },
});

if (result.success) {
  const track = bigWigModule.create(result.data);
  console.log(track.base.title);
} else {
  console.error(result.error.issues);
}
```

Creation input, base, and the top-level config reject unknown keys. Nested objects follow their module-specific schemas. Validation does not contact a data server or check file contents; to check the files, see [Check source files](#check-source-files).

`module.validate(instance)` parses a complete instance, including its type, resolved base, and source. Both `create` and `validate` throw an `Error` containing validation details on failure. Store construction and updates also validate instances. Source ownership controls built-in forms; it does not prevent application code from updating the source through the store.

## Check source files

Before creating a track from URLs someone supplied, check that the track can read the files they name. Each file-backed module below exports a check from its subpath. It reads only each file's header, or for a BAM index its first 8 bytes, and resolves with the config fields to create the track with:

```ts
import { bigBedModule, checkBigBedFiles } from "@weng-lab/genomebrowser-tracks/bigbed";
import { TrackFileError } from "@weng-lab/genomebrowser-tracks/shared";

try {
  const config = await checkBigBedFiles({ url: "YOUR_URL_HERE" }, { signal });
  const track = bigBedModule.create({ base: { id: "peaks", title: "Peaks" }, config });
} catch (error) {
  if (error instanceof TrackFileError) console.error(error.code, error.field, error.message);
  else throw error;
}
```

| Check                                   | Subpath   | Reads                                                                                                                                                                                                          |
| --------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkBigWigFiles({ url })`             | `/bigwig` | The BigWig header.                                                                                                                                                                                             |
| `checkBigBedFiles({ url, bedSchema? })` | `/bigbed` | The BigBed header. Without `bedSchema`, chooses the widest standard preset (`bed3` to `bed9`) the header's standard BED columns cover; with one, checks the header has its columns. Resolves with `bedSchema`. |
| `checkGeneFiles({ url })`               | `/gene`   | The BigBed header, which must have at least the 20 BigGenePred columns.                                                                                                                                        |
| `checkCcreBigBedFiles({ url })`         | `/ccre`   | The BigBed header, which must have BED9 standard columns and the cCRE class column.                                                                                                                            |
| `checkBamFiles({ url, indexUrl })`      | `/bam`    | The BAM header, and the start of the BAI index, which must list as many references as the BAM.                                                                                                                 |

Each check takes an optional `{ signal }`. Aborting it rejects the check with the signal's reason. Otherwise a failing check rejects with a `TrackFileError`, exported from `/shared`:

| Field     | Type                 | Meaning                                                                       |
| --------- | -------------------- | ----------------------------------------------------------------------------- |
| `code`    | `TrackFileErrorCode` | Why the file failed; see below.                                               |
| `field`   | `string`             | The config field holding the failing file's URL, such as `url` or `indexUrl`. |
| `status`  | `number`, optional   | The HTTP status the host answered with, when the failure was one.             |
| `message` | `string`             | A sentence describing the failure, naming the file.                           |
| `cause`   | `unknown`            | The reader error the check failed on, when there was one.                     |

| `code`             | Meaning                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_URL`      | The URL is not an absolute HTTP or HTTPS URL.                                                                               |
| `UNREACHABLE`      | The request failed. `status` is set when the host answered, such as 404; it is absent for network failures and CORS blocks. |
| `NO_RANGE_SUPPORT` | The host answered a byte-range request with the whole file (`status` 200).                                                  |
| `UNREADABLE`       | The host answered, but the file is not one this track type reads, or lacks the columns or index it needs.                   |

A check confirms the file's format and declared layout, not every record. A file whose header declares more standard BED columns than its records hold, or an index that is out of date for its BAM, still passes and fails when the track draws.

## Module members

A module exposes its `type`, supported `displays`, both schemas, `create`, `validate`, a `fetch` function, and a `render` map keyed by display name. First-party modules also provide `settingsComponent`; data tracks provide `tooltipComponent`. Core calls the fetcher and hosts these components when rendering the module.

For the general module API and browser stores, see the [core documentation](https://github.com/weng-lab/genomebrowser/blob/main/packages/core/docs/README.md).

Return to [Track modules](README.md) or [Tracks API reference](../README.md).
