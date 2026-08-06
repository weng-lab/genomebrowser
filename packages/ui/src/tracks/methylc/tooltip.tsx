import type {
  MethylCConfig,
  MethylCShowRows,
  MethylCTooltipItem,
  TrackTooltipComponent,
} from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../trackTooltip";
import { formatSignalValue } from "../trackTooltipFormatters";

type MethylCChannel = keyof MethylCConfig["colors"];

const rowDefinitions: readonly {
  key: keyof MethylCShowRows;
  label: string;
  channel: MethylCChannel;
  valueIndex: number;
}[] = [
  { key: "fwdCpg", label: "Plus CpG", channel: "cpg", valueIndex: 0 },
  { key: "fwdChg", label: "Plus CHG", channel: "chg", valueIndex: 1 },
  { key: "fwdChh", label: "Plus CHH", channel: "chh", valueIndex: 2 },
  { key: "fwdDepth", label: "Plus depth", channel: "depth", valueIndex: 3 },
  { key: "revCpg", label: "Minus CpG", channel: "cpg", valueIndex: 4 },
  { key: "revChg", label: "Minus CHG", channel: "chg", valueIndex: 5 },
  { key: "revChh", label: "Minus CHH", channel: "chh", valueIndex: 6 },
  { key: "revDepth", label: "Minus depth", channel: "depth", valueIndex: 7 },
];

export const MethylCTooltip: TrackTooltipComponent<MethylCTooltipItem, MethylCConfig> = ({
  item,
  context,
}) => {
  const rows: TrackTooltipRow[] = rowDefinitions
    .filter(({ key }) => item.showRows[key])
    .map(({ label, channel, valueIndex }) => ({
      label,
      value: formatSignalValue(item.tooltipValues[valueIndex]?.max),
      color: context.config.colors[channel],
    }));

  return (
    <TrackTooltip rows={rows.length ? rows : [{ label: "Channels", value: "None enabled" }]} />
  );
};
