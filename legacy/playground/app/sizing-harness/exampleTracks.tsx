import {
  defineTrackModule,
  useTooltip,
  type TrackRendererProps,
  type TrackFetchContext,
} from "@weng-lab/genomebrowser";
import { z } from "zod";

export const initialRegion = { chromosome: "chr1", start: 1_000_000, end: 1_010_000 };

const features = [
  { name: "Feature A", start: 1_000_500, end: 1_001_500 },
  { name: "Feature B", start: 1_002_000, end: 1_004_000 },
  { name: "Feature C", start: 1_005_000, end: 1_005_500 },
  { name: "Feature D", start: 1_006_000, end: 1_009_500 },
];

type Feature = (typeof features)[number];
type ExampleData = { requestedWidth: number };

function Features({
  region,
  visibleRegion,
  width,
  color,
  data,
}: TrackRendererProps<Record<string, never>, ExampleData>) {
  const tooltip = useTooltip<Feature, Record<string, never>>();
  const x = (position: number) => ((position - region.start) / (region.end - region.start)) * width;
  return (
    <g>
      {features.map((feature) => (
        <g
          key={feature.name}
          onMouseMove={(event) => tooltip.show(feature, event)}
          onMouseLeave={tooltip.hide}
        >
          <rect
            x={x(feature.start)}
            y={8}
            width={x(feature.end) - x(feature.start)}
            height={20}
            rx={2}
            fill={color}
          />
          <text x={x(feature.start)} y={44} fontSize={12} fill="#334155">
            {feature.name}
          </text>
        </g>
      ))}
      <text x={x(visibleRegion.start) + 8} y={67} fontSize={11} fill="#64748b">
        Fetch width including overscan: {Math.round(data.requestedWidth)} logical units
      </text>
    </g>
  );
}

function FeatureTooltip({ item }: { item: Feature }) {
  return (
    <g>
      <rect width={160} height={42} rx={3} fill="#fff" stroke="#94a3b8" />
      <text x={8} y={17} fontSize={12} fill="#0f172a">
        {item.name}
      </text>
      <text x={8} y={33} fontSize={11} fill="#334155">
        {(item.end - item.start).toLocaleString()} bp
      </text>
    </g>
  );
}

async function fetchExamples({
  demand,
}: TrackFetchContext<Record<string, never>>): Promise<ExampleData> {
  return { requestedWidth: demand.width };
}

export const exampleModule = defineTrackModule<Feature>()({
  type: "sizing-example",
  configSchema: z.object({}),
  defaults: { height: 76, color: "#2563eb" },
  fetch: fetchExamples,
  render: { full: Features },
  tooltipComponent: FeatureTooltip,
});
