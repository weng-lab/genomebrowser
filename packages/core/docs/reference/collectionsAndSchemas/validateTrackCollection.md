# validateTrackCollection

Validate external or authored collection data against the modules your application supports before creating runtime instances. Import this function from `@weng-lab/genomebrowser`.

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

The return type infers the supplied modules and contains their authored track inputs plus normalized `TrackCollectionView[]` when views exist. Validation executes module defaults and transformations to check validity, then discards the parsed track output. Creation parses the original input again, so transformations do not compound. Transform callbacks should be pure; they are not guaranteed a single invocation. Those entries are not detached copies; treat validated input as data and create instances before use. `validateTrackCollection` does not add views or infer assembly compatibility.

### Signature and result

```ts
import type { AnyTrackModule, TrackCollection, TrackCollectionView } from "@weng-lab/genomebrowser";

declare function validateTrackCollection<const Modules extends readonly AnyTrackModule[]>(
  input: unknown,
  modules: Modules,
): Omit<TrackCollection<Modules>, "views"> & { views?: TrackCollectionView[] };
```

The returned collection has normalized collection and view fields while `tracks` retains the supplied array and its authored entries. Config defaults are checked but are not inserted into those entries. Validation is synchronous and does not fetch track data or the collection's `$schema`. Failures throw rather than returning a store mutation result. Handle thrown errors at your input boundary; error text contains details but has no exported error-code contract.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
