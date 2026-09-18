# validateTrackCollection

Validate collection input against the modules supported by the application before creating track instances. Import this function from `@weng-lab/genomebrowser`.

## Usage

```ts
import { validateTrackCollection } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const modules = [bigWigModule] as const;
const collection = validateTrackCollection(
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

const tracks = collection.tracks.map(({ base, config }) => bigWigModule.create({ base, config }));
```

Replace `YOUR_URL_HERE` with your data URL. Pass `tracks` to a [track store](../browserSetup/trackStore.md) to activate them. See [TrackCollection](trackCollection.md) for the complete input contract.

## API

`validateTrackCollection(input, modules)` accepts an `unknown` object and a readonly module list, not a JSON string. If loading a string, parse it with `JSON.parse` first and handle parsing failures separately.

Validation checks the collection structure, each module's creation schema, duplicate track and view IDs, and every field referenced by columns, grouping, and leaf labels. It throws an `Error` containing validation details on failure. An empty module list or duplicate module types also throws.

Validation runs each module's defaults and transforms to check the input, then discards that parsed track result. Creating a track parses the original input again, so it does not apply transforms to already-transformed values. Keep transforms free of side effects because they can run more than once.

The function does not check whether the collection's assembly matches the browser's assembly. The application must make that check.

### Signature and result

```ts
import type { AnyTrackModule, TrackCollection, TrackCollectionView } from "@weng-lab/genomebrowser";

declare function validateTrackCollection<const Modules extends readonly AnyTrackModule[]>(
  input: unknown,
  modules: Modules,
): Omit<TrackCollection<Modules>, "views"> & { views?: TrackCollectionView[] };
```

The return type uses the supplied module types for its track inputs. If the collection contains views, the result includes them as `TrackCollectionView[]` with defaults applied. The function does not add views when they are absent.

The returned collection has validated collection fields, but `tracks` is the original array containing the original entries. Validation does not copy the entries or insert config defaults into them. Create instances from those entries before adding tracks to a browser.

Validation runs synchronously and does not fetch track data or the collection's `$schema`. Catch thrown errors when loading collection input. Errors contain validation details but have no exported error codes, unlike store mutation results.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
