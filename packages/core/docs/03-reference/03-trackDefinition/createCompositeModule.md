# createCompositeModule

A composite track displays ordinary child tracks in one track row with one shared margin. Register `createCompositeModule()` alongside the child modules. The factory has no default settings UI. For a ready-to-use module with MUI settings, import `compositeModule` from `@weng-lab/genomebrowser-tracks/composite`. Core hosts each child's normal fetching, rendering, settings, callbacks, and tooltips.

## Usage

```ts
import { createCompositeModule, createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const composite = createCompositeModule();
const signals = composite.create({
  base: { id: "signals", title: "Signals", display: "overlay", height: 150 },
  config: { opacity: 0.6 },
  tracks: [
    bigWigModule.create({
      base: { id: "atac", title: "ATAC", color: "#527ac7" },
      config: { url: "YOUR_URL_HERE" },
    }),
    bigWigModule.create({
      base: { id: "histone", title: "Histone", color: "#d2693c" },
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});
const useTrackStore = createTrackStore({ modules: [bigWigModule, composite], tracks: [signals] });
```

Replace each URL with the corresponding BigWig source. `tracks` contains runtime child instances. Child IDs remain the same through grouping, extraction, and ungrouping. Nested composites are not supported.

## CompositeInput and CompositeTrack

`createCompositeModule(options?): CompositeTrackModule` returns a module with `kind: "composite"`, `type: "composite"`, and creation and validation schemas. The optional `options.settingsComponent` accepts a `TrackSettingsComponent<CompositeTrack["config"]>` and defaults to `undefined`. It has no fetcher or ordinary data renderer. Ordinary modules created by `defineTrackModule` have `kind: "track"` automatically. Dispatch on `kind` when handling registered modules.

`create(input: CompositeInput): CompositeTrack` applies defaults and validates the structure. `validate(input: unknown): CompositeTrack` validates a complete instance. Both throw for invalid input. Store insertion additionally validates each child through its registered module and checks global IDs and pinning.

| Input                   | Default     | Contract                                                                                                                      |
| ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `base.id`, `base.title` | Required    | Nonempty strings. ID must differ from every child ID.                                                                         |
| `base.display`          | `"stack"`   | `"stack"` or `"overlay"`. This selects composite layout; child display modes remain unchanged.                                |
| `base.height`           | `150`       | Positive configured overlay height.                                                                                           |
| `base.color`            | `"#000000"` | Six-digit hexadecimal margin color.                                                                                           |
| `source`                | `"user"`    | Ordinary source semantics. `"host"` disables structural controls in composite settings, without restricting store operations. |
| `config.gap`            | `4`         | Nonnegative gap between children in stack layout.                                                                             |
| `config.opacity`        | `1`         | Number from 0 to 1, applied to each child in overlay layout.                                                                  |
| `tracks`                | Required    | Nonempty array of ordinary runtime instances with distinct IDs.                                                               |

`CompositeTrack` contains `type`, `base`, `source`, `config`, and `tracks` with defaults resolved. Treat stored instances as immutable. Use [track store actions](../01-browserSetup/trackStore.md#composite-operations) to change them.

## Layout and data lifetime

Stack plot height equals the sum of child heights plus gaps. It does not overwrite the configured overlay height. Overlay children share that configured height and retain independent numerical scales. Automatic child heights update the child's own settings, including while overlay layout is active.

Each child receives its own data and render region. Pending children and failures do not hide completed siblings. Grouping, extraction, child reordering, and composite layout changes preserve requests, results, and resources when child fetch inputs are unchanged. Removing a child releases its resources normally. Browser loading gates still apply.

Children handle pointer events in normal SVG paint order. Each child has its own stationary overlays and callbacks. Overlay tooltips stack each child's content at the same pointer position, with the last-painted child first. Custom renderers participate by registering hit targets through [useTooltip](../04-rendererIntegration/useTooltip.md#overlay-composite-tooltips). There is no active-child interaction mode or shared numerical scale. Render errors are isolated per child and retried when that child's track instance or displayed data state changes.

## Settings

Supply `settingsComponent` to use your own form. Core supplies the normal settings props and validated updates. Use `<TrackSettings trackId={childId} />` to embed a child's registered settings inside the form; see [TrackSettings](trackSettings.md#tracksettings).

The first-party tracks package supplies `compositeModule` with MUI controls for base settings, composite layout, and child settings. Core does not depend on that package or MUI.

Return to [Track definition](README.md).
