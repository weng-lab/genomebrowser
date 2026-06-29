import { z } from "zod";
import { fetchOnChange } from "./fetchOnChange";
import { useInteraction } from "./interaction";
import { defineTrackModule } from "./system";
import type {
  BrowserRegion,
  TrackFetchContext,
  TrackRenderer,
  TrackRendererProps,
  TrackSettingsProps,
} from "./types";

type MyData = number;
type MyInteractionItem = { value: number };

const myConfigSchema = z.object({
  field: fetchOnChange(z.string()),
});

type myConfig = z.infer<typeof myConfigSchema>;

async function otherFetch(ctx: TrackFetchContext<myConfig>): Promise<MyData[]> {
  if (ctx.config.field === "hello") return [1, 2, 3];
  return [];
}

const FullRenderer: TrackRenderer<myConfig, MyData[]> = (
  props: TrackRendererProps<myConfig, MyData[]>,
) => {
  const interaction = useInteraction<MyInteractionItem>();
  return (
    <g onClick={() => interaction?.onClick?.({ value: props.data[0] ?? 0 })}>
      <text>{props.config.field}</text>
    </g>
  );
};

function DenseRenderer(props: TrackRendererProps<myConfig, MyData[]>) {
  if (props.config.field) return <g></g>;
  return <></>;
}

function MySettings({ config, updateConfig }: TrackSettingsProps<myConfig>) {
  return <button onClick={() => updateConfig({ field: config.field })}>Save</button>;
}

export const myModule = defineTrackModule({
  type: "myModule",
  configSchema: myConfigSchema,
  defaults: {
    base: {
      display: "full",
      height: 50,
      color: "#55ff55",
    },
    config: { field: "a" },
  },
  fetch: otherFetch,
  render: {
    full: FullRenderer,
    dense: DenseRenderer,
  },
  settingsComponent: MySettings,
});

// Pretend usage
export async function main() {
  const locus: BrowserRegion = { chromosome: "chr1", start: 1, end: 2 };

  const track = myModule.create({
    base: {
      id: "1",
      title: "myTrack",
    },
    interaction: {
      onClick(item: MyInteractionItem) {
        item.value satisfies number;
      },
    },
  });
  const validatedTrack = myModule.validate(track);

  const fetcher = myModule.fetch;

  const data = await fetcher({
    config: validatedTrack.config,
    region: locus,
  });

  // @ts-expect-error renderer key does not exist
  let Renderer = myModule.render["unknown"];
  Renderer = myModule.render["full"];

  return (
    <Renderer
      id="myModule"
      config={validatedTrack.config}
      data={data}
      region={locus}
      height={50}
      width={1000}
    />
  );
}
