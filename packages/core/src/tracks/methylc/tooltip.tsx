import { TrackTooltip } from "../shared/TrackTooltip";
import type { TrackRuntimeContext } from "../../modules/types";
import type { MethylCConfig, MethylCShowRows, MethylCTooltipItem } from "./types";

export function MethylCTooltip({
  item,
}: {
  item: MethylCTooltipItem;
  context: TrackRuntimeContext<MethylCConfig>;
}) {
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
