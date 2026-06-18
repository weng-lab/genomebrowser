import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchOnChange } from "../../modules/fetchOnChange";
import { TrackTooltip } from "../shared/TrackTooltip";
import { fetchMethylC } from "./fetch";
import { SplitMethylC } from "./render";
import type { MethylCShowRows, MethylCTooltipItem } from "./types";

const defaultMethylCColors = {
  cpg: "#648bd8",
  chg: "#ff944d",
  chh: "#ff00ff",
  depth: "#525252",
};

const yRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .refine((range) => range.min < range.max, {
    error: "min must be less than max",
    path: ["min"],
  });

const channelSchema = z.object({
  url: fetchOnChange(z.string()),
});

const strandUrlsSchema = z.object({
  cpg: channelSchema,
  chg: channelSchema,
  chh: channelSchema,
  depth: channelSchema,
});

const methylCConfigSchema = z.object({
  urls: z.object({
    plusStrand: strandUrlsSchema,
    minusStrand: strandUrlsSchema,
  }),
  colors: z
    .object({
      cpg: z.string().default(defaultMethylCColors.cpg),
      chg: z.string().default(defaultMethylCColors.chg),
      chh: z.string().default(defaultMethylCColors.chh),
      depth: z.string().default(defaultMethylCColors.depth),
    })
    .default(defaultMethylCColors),
  maskCpgByCoverage: z.boolean().default(false),
  range: yRangeSchema.optional(),
});

export const methylCModule = defineTrackModule({
  type: "methylc",
  defaults: {
    height: 100,
    tooltip: ({ item }) => <MethylCTooltip item={item} />,
  },
  schema: methylCConfigSchema,
  fetch: fetchMethylC,
  render: {
    split: SplitMethylC,
  },
});

function MethylCTooltip({ item }: { item: MethylCTooltipItem }) {
  const rows = getMethylCTooltipRows(item);
  return (
    <TrackTooltip>
      <g>
        {rows.map((row, index) => (
          <text
            key={row.label}
            y={index * 14}
            fill="#000000"
            fontSize={12}
            dominantBaseline="middle"
          >
            {row.label}: {row.value}
          </text>
        ))}
      </g>
    </TrackTooltip>
  );
}

function getMethylCTooltipRows({ showRows, tooltipValues }: MethylCTooltipItem) {
  const rows: { key: keyof MethylCShowRows; label: string; value: string }[] = [
    { key: "fwdCpg", label: "Fwd CpG", value: formatMethylCValue(tooltipValues[0]) },
    { key: "fwdChg", label: "Fwd CHG", value: formatMethylCValue(tooltipValues[1]) },
    { key: "fwdChh", label: "Fwd CHH", value: formatMethylCValue(tooltipValues[2]) },
    { key: "fwdDepth", label: "Fwd depth", value: formatMethylCValue(tooltipValues[3]) },
    { key: "revCpg", label: "Rev CpG", value: formatMethylCValue(tooltipValues[4]) },
    { key: "revChg", label: "Rev CHG", value: formatMethylCValue(tooltipValues[5]) },
    { key: "revChh", label: "Rev CHH", value: formatMethylCValue(tooltipValues[6]) },
    { key: "revDepth", label: "Rev depth", value: formatMethylCValue(tooltipValues[7]) },
  ];
  return rows.filter((row) => showRows[row.key]);
}

function formatMethylCValue(point: MethylCTooltipItem["tooltipValues"][number] | undefined) {
  if (!point || point.max === null) return "n/a";
  return point.max.toFixed(2);
}
