# Customize an existing track module

To make a track that works like an existing one with a few changes, reuse that module's fetcher and renderers in a new `defineTrackModule` definition. Replace the schema, tooltip, or settings as needed.

This example starts with BigBed and changes its schema, tooltip, and settings for cCRE tracks. [Create a custom track](customTracks.md) covers building a module from scratch.

The tracks package already provides `ccreBigBedModule` through `@weng-lab/genomebrowser-tracks/ccre`. Use that module for its standard cCRE behavior. The example uses the dependencies from [Create a genome browser](../01-gettingStarted/01-firstBrowser.md), plus `zod@4` as a direct dependency.

## Change the configuration

A module's `configSchema` is a Zod object. Extend it to retain the original fields and their validation while adding or replacing fields for the new track type. The reused fetcher and renderers still require compatible configuration, so retain the fields they consume.

Create `applicationCcreModule.tsx`. This schema keeps BigBed's URL and row-height settings, restricts `bedSchema` to the cCRE format, and adds a tooltip option. The cCRE format expects Registry BED9+1 records, including a classification column. Selecting that format controls how the file is parsed; it does not convert an arbitrary BigBed file into cCRE data.

```tsx
import { z } from "zod";
import {
  defineTrackModule,
  fetchOnChange,
  type TrackSettingsProps,
  type TrackFetchContext,
  type TrackRendererProps,
  type TrackRuntimeContext,
} from "@weng-lab/genomebrowser";
import {
  bigBedModule,
  type BigBedData,
  type BigBedRow,
} from "@weng-lab/genomebrowser-tracks/bigbed";

const configSchema = bigBedModule.configSchema.extend({
  bedSchema: fetchOnChange(z.literal("ccre").default("ccre")),
  showClassification: z.boolean().default(true),
});

type Config = z.output<typeof configSchema>;
```

Replacing a schema field also replaces its fetch marker, so the new `bedSchema` explicitly uses `fetchOnChange`. The inherited URL field keeps its existing marker. `showClassification` only changes tooltip content and therefore needs no refetch marker.

## Replace the tooltip and settings

A tooltip receives the feature emitted by the renderer and the track's current configuration. The following tooltip shows the cCRE name and region, with classification controlled by the new setting. BigBed's public item type supports additional fields but types them as `unknown`, so check `ccreClass` before displaying it.

Append these components to the same file. Tooltip content is SVG because core hosts it within the browser's SVG drawing.

```tsx
function CcreTooltip({ item, context }: { item: BigBedRow; context: TrackRuntimeContext<Config> }) {
  return (
    <g>
      <text fill={context.base.color}>{item.name ?? "cCRE"}</text>
      <text y={18}>
        {item.chromosome}:{item.start}-{item.end}
      </text>
      {context.config.showClassification && typeof item.ccreClass === "string" && (
        <text y={36}>{item.ccreClass}</text>
      )}
    </g>
  );
}

function CcreSettings(props: TrackSettingsProps<Config, BigBedRow>) {
  return (
    <label>
      <input
        type="checkbox"
        checked={props.track.config.showClassification}
        onChange={(event) => {
          const result = props.updateTrack({
            config: { showClassification: event.currentTarget.checked },
          });
          if (!result.ok) console.error(result.error);
        }}
      />
      Show cCRE classification in tooltips
    </label>
  );
}
```

The replacement settings component owns the complete form. This example exposes only the tooltip option because the application supplies the data source. Include any other settings needed by the application in this component. Settings receive `track` and `updateTrack` from core, so no application store import is needed.

## Define the customized module

Pass the new schema and components to `defineTrackModule`, alongside BigBed's existing fetcher and renderers. Give the module a unique `type` so it can coexist with ordinary BigBed tracks in the same registry. Defaults belong to the new definition as well. The small wrappers accept the customized config type and forward it to BigBed, which uses the fields retained from its schema.

```tsx
const DenseBigBed = bigBedModule.render.dense;
const SquishBigBed = bigBedModule.render.squish;

export const applicationCcreModule = defineTrackModule<BigBedRow>()({
  type: "application-ccre",
  defaults: { height: 24, color: "#2266aa" },
  configSchema,
  fetch: (context: TrackFetchContext<Config>) => bigBedModule.fetch(context),
  render: {
    dense: (props: TrackRendererProps<Config, BigBedData>) => <DenseBigBed {...props} />,
    squish: (props: TrackRendererProps<Config, BigBedData>) => <SquishBigBed {...props} />,
  },
  settingsComponent: CcreSettings,
  tooltipComponent: CcreTooltip,
});
```

`defineTrackModule` builds creation and validation functions for the new schema and type. Copying a finished module and replacing its `configSchema` would retain creation and validation functions built for the original definition. Reuse its behavior through a new definition instead.

Here, BigBed still loads the records and draws their features. To filter or process the records before drawing them, supply a different fetcher that returns the data expected by the selected renderers. If the data shape changes, adapt the renderers and interaction item type together. [Data fetching and rendering](dataFetching.md) explains which changes require new requests.

## Add the customized type to a browser

Register and create the new module just like any other track type. The schema supplies `bedSchema: "ccre"` and the tooltip default, so the track only needs its data URL. This store belongs in application initialization, alongside the browser store from the first guide.

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { applicationCcreModule } from "./applicationCcreModule";

export const useTrackStore = createTrackStore({
  modules: [applicationCcreModule],
  tracks: [
    applicationCcreModule.create({
      base: { id: "regulatory-elements", title: "Regulatory elements", display: "squish" },
      config: { url: "YOUR_URL_HERE" },
      source: "host",
    }),
  ],
});
```

Replace the URL with a browser-accessible cCRE BigBed file for the browser's assembly, and pass `useTrackStore` to `GenomeBrowser`. To offer the variant through a [collection](../01-gettingStarted/04-trackCollections.md), register it in the collection's module set and use `type: "application-ccre"` in its entries. The tooltip and settings remain module behavior in application code; the collection stores their configuration values.

## Further reading

- [Module definitions](../03-reference/03-trackDefinition/defineTrackModule.md): definition options, defaults, and creation contracts.
- [Track settings](../03-reference/03-trackDefinition/trackSettings.md): settings components and validated updates.
- [Tooltips](../03-reference/04-rendererIntegration/useTooltip.md): tooltip components and runtime context.
