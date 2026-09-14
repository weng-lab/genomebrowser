# Create a custom track

A custom module defines how a new track type validates configuration, produces data, and draws that data. Core supplies the surrounding browser behavior, including clipping, panning, loading and error presentation, and the settings dialog. The module supplies the parts specific to its data.

This guide builds an annotation track from regions supplied directly in configuration. The example runs without a server. Its fetcher and renderer use the same APIs as a track that loads remote data. It assumes the core and React setup from [Create a genome browser](../gettingStarted/firstBrowser.md). Module schemas use Zod, so add it as a direct dependency:

```sh
pnpm add zod@latest
```

## Define the configuration and data

The configuration schema describes the values needed to create a track instance. For annotations, those values are the regions and whether their labels should appear. Each region includes its chromosome so the same instance can follow navigation across the genome.

The fetch function selects annotations that overlap the requested region. Because its result depends on `intervals`, that field is marked with `fetchOnChange`. `showLabels` is used only by the renderer, so changing it can reuse the fetched annotations.

Create `annotationModule.tsx` with the following schema and types. The region schema rejects empty or reversed regions before an instance enters the store. `Config` describes parsed values, including the default for `showLabels`.

```tsx
import { z } from "zod";
import { fetchOnChange } from "@weng-lab/genomebrowser";

const annotationSchema = z
  .object({
    chromosome: z.string().min(1),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    label: z.string().min(1),
  })
  .refine((item) => item.start < item.end, {
    message: "Annotation start must precede end",
  });

const configSchema = z.object({
  intervals: fetchOnChange(z.array(annotationSchema)),
  showLabels: z.boolean().default(true),
});

type Annotation = z.output<typeof annotationSchema>;
type Config = z.output<typeof configSchema>;
type Data = Annotation[];
```

## Produce data for the requested region

Every module has an asynchronous fetch function, even when its data is already local. Core calls it with a snapshot of the track configuration and the region needed for rendering. That requested region includes extra space for panning, so the fetcher should use `demand.region` instead of reading a browser store.

Add `fetchAnnotations` to the same file, with its type import at the top. It selects annotations that overlap the requested chromosome and region. Returning an empty array is a successful empty track, while throwing or rejecting would produce a track error.

```ts
import type { TrackFetch } from "@weng-lab/genomebrowser";

const fetchAnnotations: TrackFetch<Config, Data> = async ({ track, demand }) => {
  const { region } = demand;
  return track.config.intervals.filter(
    (item) =>
      item.chromosome === region.chromosome && item.start < region.end && item.end > region.start,
  );
};
```

## Draw the regions

A renderer receives successful data and the dimensions of its drawing area. Genomic positions map to SVG coordinates through the supplied `region` and `width`: subtract the region start, divide by its span, and multiply by the width. Core moves and clips the resulting SVG during panning, so this calculation uses the render region rather than the visible viewport.

The renderer below draws a rectangle for each annotation and, when enabled, a label beneath it. All annotations share one row in this small example. A module that needs to separate overlapping features can add row layout and automatic height later.

Add this component to `annotationModule.tsx`:

```tsx
import type { TrackRendererProps } from "@weng-lab/genomebrowser";

function AnnotationRenderer({
  data,
  config,
  region,
  width,
  height,
  color,
}: TrackRendererProps<Config, Data>) {
  const x = (base: number) => ((base - region.start) / (region.end - region.start)) * width;

  return (
    <g>
      {data.map((item, index) => (
        <g key={index}>
          <rect
            x={x(item.start)}
            y={0}
            width={Math.max(1, x(item.end) - x(item.start))}
            height={Math.max(1, height - 18)}
            fill={color}
          />
          {config.showLabels && (
            <text x={x(item.start)} y={height - 3} fontSize={12}>
              {item.label}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}
```

## Assemble and register the module

The module definition connects the schema, fetcher, and renderer under a unique type name. The `render` map gives this module one display, `full`, and the base defaults establish its initial height and color. Declaring the `Annotation` item type also prepares the module for typed callbacks and tooltips.

Place this definition after the functions in `annotationModule.tsx`:

```tsx
import { defineTrackModule } from "@weng-lab/genomebrowser";

export const annotationModule = defineTrackModule<Annotation>()({
  type: "example-annotations",
  configSchema,
  defaults: { height: 48, color: "#2266aa" },
  fetch: fetchAnnotations,
  render: { full: AnnotationRenderer },
});
```

Register this module in a track store and create an instance from it. The following standalone `AnnotationBrowser.tsx` opens a region containing two annotations, so the first result can be checked without supplying a remote data URL.

```tsx
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { annotationModule } from "./annotationModule";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
});

const useTrackStore = createTrackStore({
  modules: [annotationModule],
  tracks: [
    annotationModule.create({
      base: { id: "annotations", title: "Annotations" },
      config: {
        intervals: [
          { chromosome: "chr1", start: 1_010_000, end: 1_025_000, label: "Region A" },
          { chromosome: "chr1", start: 1_055_000, end: 1_075_000, label: "Region B" },
        ],
      },
    }),
  ],
});

export function AnnotationBrowser() {
  return <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />;
}
```

The remaining sections extend this working module. They retain the same schema, fetched data, and instance configuration.

## Add a settings form

Settings edit the current instance through callbacks supplied by core. The module owns the complete form; the browser opens the dialog and validates updates. Keeping settings in the track store allows them to survive renderer remounts and remain visible to application controls.

Add `AnnotationSettings` before the module definition, then set `settingsComponent: AnnotationSettings` in that definition. The checkbox changes only `showLabels`, so a valid edit redraws the existing data without another fetch. A rejected edit remains visible as a form error.

```tsx
import { useState } from "react";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";

function AnnotationSettings({ track, updateTrack }: TrackSettingsProps<Config, Annotation>) {
  const [error, setError] = useState<string | null>(null);

  return (
    <fieldset>
      <legend>Annotation display</legend>
      <label>
        <input
          type="checkbox"
          checked={track.config.showLabels}
          onChange={(event) => {
            const result = updateTrack({ config: { showLabels: event.currentTarget.checked } });
            setError(result.ok ? null : result.error);
          }}
        />
        Show labels
      </label>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
```

A source-editing form also needs an ownership policy. Instances carry `source: "user"` or `"host"`, but core cannot identify which custom config fields represent a source. The module's form must use that value to decide which source controls are editable. This example exposes only label visibility.

## Emit items and show tooltips

The renderer knows which annotation is under the pointer; the application knows what selecting it should do. Pass the annotation to a `useInteraction<Annotation>()` handler. Core then calls the application's callback with that item and the current track context.

Tooltips use the same item through `useTooltip`. Add both imports and call the hooks at the top of `AnnotationRenderer`:

```tsx
import { useInteraction, useTooltip } from "@weng-lab/genomebrowser";

const interaction = useInteraction<Annotation>();
const tooltip = useTooltip<Annotation, Config>();
```

Replace the rectangle inside the renderer's map with this version. Pointer clicks and keyboard activation invoke the same item callback. Hovering shows the tooltip and emits hover events; leaving clears both. The label remains part of the drawing rather than a separate interactive target.

```tsx
<rect
  x={x(item.start)}
  y={0}
  width={Math.max(1, x(item.end) - x(item.start))}
  height={Math.max(1, height - 18)}
  fill={color}
  role={interaction?.onClick ? "button" : undefined}
  tabIndex={interaction?.onClick ? 0 : undefined}
  aria-label={item.label}
  onClick={() => interaction?.onClick?.(item)}
  onKeyDown={(event) => {
    if (!event.repeat && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      interaction?.onClick?.(item);
    }
  }}
  onMouseEnter={(event) => {
    interaction?.onHover?.(item);
    tooltip.show(item, event);
  }}
  onMouseLeave={() => {
    interaction?.onLeave?.(item);
    tooltip.hide();
  }}
/>
```

The module's tooltip component supplies SVG content, while core positions it near the pointer. Add this component before the module definition and set `tooltipComponent: AnnotationTooltip`. Its context reflects the current title and color, including edits made after the track was created.

```tsx
import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";

const AnnotationTooltip: TrackTooltipComponent<Annotation, Config> = ({ item, context }) => (
  <g>
    <text x={6} y={14} fill={context.base.color}>
      {context.base.title}
    </text>
    <text x={6} y={30}>
      {item.label}: {item.start}–{item.end}
    </text>
  </g>
);
```

To connect activation to navigation, pass the following object as the second argument to the existing `annotationModule.create(...)` call in `AnnotationBrowser.tsx`. The renderer emits only the item; the application callback chooses the resulting browser action. This callback is defined at file scope with the track instance, so it accesses the store through `getState()` rather than a React hook.

```ts
{
  onClick: (item) => {
    const result = useBrowserStore.getState().setRegion({
      chromosome: item.chromosome,
      start: item.start,
      end: item.end,
    });
    if (!result.ok) console.error(result.error);
  },
}
```

Hover callbacks can run frequently as the pointer crosses features. Keep transient readout state in the component that displays it, and clear retained hover state on leave. Requests or other expensive work triggered by hover need application-level deduplication rather than assuming every renderer limits event frequency.

## Further reading

- [Customize an existing track module](customizeTrackModules.md): change a module's schema, settings, or tooltip while reusing its fetcher and renderers.
- [Data fetching and rendering](dataFetching.md): remote requests, fetch-dependent config, and resource reuse.
- [Renderer integration](../reference/rendererIntegration/README.md): fixed labels, overlays, and automatic track height.
- [Track settings](../reference/trackDefinition/trackSettings.md): validated updates and complete settings-form ownership.
