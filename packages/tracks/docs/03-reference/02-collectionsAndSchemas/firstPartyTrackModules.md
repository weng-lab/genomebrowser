# firstPartyTrackModules

`firstPartyTrackModules` is a readonly tuple with the eight modules in this order: Ruler, BigBed, BigWig, BulkBed, CAVE, cCRE BigBed, Gene, MethylC.

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";

const useTrackStore = createTrackStore({ modules: firstPartyTrackModules });
```

Register individual modules if your application supports only some track types. Importing one track subpath does not load the other tracks. The store then rejects other types. Use the same module list to generate narrower collection schemas. Importing the package root loads all eight modules because it constructs `firstPartyTrackModules`.

The tuple contains module definitions, not track instances. Registration alone creates no visible tracks. Pass instances created by the modules in the store's `tracks` option.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
