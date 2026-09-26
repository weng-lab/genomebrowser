import { createRoot } from "react-dom/client";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  useTooltip,
  type TrackRendererProps,
  type TrackSettingsProps,
} from "@weng-lab/genomebrowser";

const configSchema = z.object({
  fail: z.boolean().default(false),
  tooltipWidth: z.number().default(120),
});
type Config = z.output<typeof configSchema>;
const params = new URLSearchParams(location.search);
const scale = Number(params.get("scale") ?? 1);
const trackWidth = params.has("compact") ? 200 : 600;
const origin = Number(params.get("origin") ?? 0);
const initialTooltipWidth = Number(params.get("tooltipWidth") ?? 120);
const tooltipHeight = Number(params.get("tooltipHeight") ?? 60);
function Renderer({
  id,
  width,
  height,
  color,
  visibleRegion,
  region,
}: TrackRendererProps<Config, unknown>) {
  const tooltip = useTooltip<string, Config>();
  return (
    <rect
      data-testid={id}
      x={((visibleRegion.start - region.start) / (region.end - region.start)) * width}
      width={((visibleRegion.end - visibleRegion.start) / (region.end - region.start)) * width}
      height={height}
      fill={color}
      onMouseMove={(event) => tooltip.show(id, event)}
      onMouseLeave={tooltip.hide}
    />
  );
}
function Settings({ track, updateTrack }: TrackSettingsProps<Config>) {
  return (
    <>
      <label>
        Title
        <input
          value={track.base.title}
          onChange={(event) => updateTrack({ base: { title: event.target.value } })}
        />
      </label>
      <label>
        Color
        <input
          value={track.base.color}
          onChange={(event) => updateTrack({ base: { color: event.target.value } })}
        />
      </label>
      <div style={{ height: 650 }}>Module settings</div>
      <button>Last setting</button>
    </>
  );
}
const module = defineTrackModule({
  type: "interaction-fixture",
  configSchema,
  fetch: async ({ track }) => {
    if (track.config.fail)
      throw new Error(Array.from({ length: 30 }, (_, i) => `Error detail ${i + 1}`).join("\n"));
    return null;
  },
  render: { full: Renderer, dense: Renderer },
  settingsComponent: Settings,
  tooltipComponent: ({ context }) => {
    const tooltipWidth = context.config.tooltipWidth;
    return (
      <g role="tooltip">
        <rect x={origin} y={origin} width={tooltipWidth} height={tooltipHeight} fill="#fff5cc" />
        <text x={origin + 5} y={origin + 20}>
          {tooltipWidth < 100 ? "Info" : "Track details"}
        </text>
      </g>
    );
  },
});
const errors = params.has("errors");
const useBrowserStore = createBrowserStore({
  assembly: { id: "fixture", chromosomes: { chr1: 12000, chr2: 12000 } },
  region: {
    chromosome: "chr1",
    start: params.get("region") === "upper" ? 11400 : params.has("region") ? 0 : 200,
    end:
      params.get("region") === "upper"
        ? 12000
        : params.get("region") === "lower"
          ? 600
          : params.get("region") === "base"
            ? 1
            : 800,
  },
  selectionHighlight: { color: "#ff0000", opacity: 0.7, type: "outlined" },
  trackWidth,
  marginWidth: 100,
});
const useTrackStore = createTrackStore({
  modules: [module, rulerModule],
  pinnedTrackIds: ["a"],
  tracks: [
    ...(params.has("ruler")
      ? [rulerModule.create({ base: { id: "ruler", title: "Coordinates" }, config: {} })]
      : []),
    ...["a", "b", "c"].map((id, index) =>
      module.create({
        base: {
          id,
          title: id.toUpperCase(),
          height: errors && index < 2 ? [10, 60][index] : params.has("compact") ? 10 : 100,
          color: ["#99bbdd", "#aadd99", "#ddaa99"][index],
        },
        config: { fail: errors && index < 2, tooltipWidth: initialTooltipWidth },
      }),
    ),
  ],
});
function App() {
  const region = useBrowserStore((s) => s.region);
  const mode = useBrowserStore((s) => s.selectionMode);
  const highlights = useBrowserStore((s) => s.highlights);
  const tracks = useTrackStore((s) => s.tracks);
  const order = useTrackStore((s) => s.order);
  return (
    <>
      <nav>
        <a href="/">Signal</a> | <a href="/dynseq.html">Dynseq</a>
      </nav>
      <div>
        {(["pan", "zoom", "highlight"] as const).map((value) => (
          <button key={value} onClick={() => useBrowserStore.getState().setSelectionMode(value)}>
            {value}
          </button>
        ))}
        <button
          onClick={() => {
            for (const track of useTrackStore.getState().tracks) {
              if (track.type === module.type)
                useTrackStore
                  .getState()
                  .updateTrack(track.base.id, { config: { tooltipWidth: 40 } });
            }
          }}
        >
          Small tooltip
        </button>
        <button onClick={() => useBrowserStore.getState().setTrackWidth(400)}>Narrow plot</button>
        <button onClick={() => useTrackStore.getState().setPinnedTrackIds([])}>Unpin</button>
        <button
          onClick={() =>
            useBrowserStore.getState().setRegion({ chromosome: "chr2", start: 200, end: 800 })
          }
        >
          Chromosome 2
        </button>
      </div>
      <output aria-label="Visible region">
        {region.chromosome}:{region.start}-{region.end}
      </output>
      <output aria-label="Selection mode">{mode}</output>
      <output aria-label="Highlights">{JSON.stringify(highlights)}</output>
      <output aria-label="Track order">{order.join(",")}</output>
      <output aria-label="Displays">
        {tracks.map((t) => `${t.base.id}:${t.base.display}`).join(",")}
      </output>
      <section
        id="browser"
        style={{
          width: (trackWidth + 100) * scale + 2,
          maxWidth: "100%",
          maxHeight: params.has("panel") ? 250 : undefined,
          overflowY: "auto",
        }}
      >
        <GenomeBrowser
          scale={scale}
          sizing="fixed"
          browserStore={useBrowserStore}
          trackStore={useTrackStore}
        />
      </section>
      <div style={{ height: 1200 }}>Page scroll space</div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
