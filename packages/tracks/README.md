# @weng-lab/genomebrowser-tracks

MUI-based track modules for `@weng-lab/genomebrowser`.

The public API may change during the alpha release.

## What it provides

The package exports BigBed, BigWig, BulkBed, CAVE, MethylC, and Transcript modules. Each module includes a configuration schema, data fetcher, renderer, settings panel, and tooltip.

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
  tracks: [
    bigWigModule.create({
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});
```

`@weng-lab/genomebrowser` provides the runtime and module APIs. This package owns the MUI settings and SVG tooltip UI used by first-party tracks. Import reusable settings controls, tooltip helpers, signal condensation, layout, and coordinate helpers from `/shared`.

## Documentation

- [Overview](docs/README.md)
- [Getting started](docs/gettingStarted.md)
- [Export contract](docs/exports.md)
- [Shared APIs](docs/shared.md)
- [Track settings](docs/trackSettings.md)
- [Signal condensation](docs/signal.md)
- [Track tooltips](docs/trackTooltips.md)
- [BigBed](docs/tracks/bigbed.md)
- [BigWig](docs/tracks/bigwig.md)
- [BulkBed](docs/tracks/bulkbed.md)
- [CAVE](docs/tracks/cave.md)
- [MethylC](docs/tracks/methylc.md)
- [Transcript](docs/tracks/transcript.md)
