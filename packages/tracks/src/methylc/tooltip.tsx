import type { TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../tooltips/trackTooltip";
import { formatSignalValue } from "../tooltips/trackTooltipFormatters";
import type { MethylCConfig, MethylCShowRows, MethylCTooltipItem } from "./types";
const rows: readonly {
  key: keyof MethylCShowRows;
  label: string;
  channel: keyof MethylCConfig["colors"];
  index: number;
}[] = [
  { key: "fwdCpg", label: "Plus CpG", channel: "cpg", index: 0 },
  { key: "fwdChg", label: "Plus CHG", channel: "chg", index: 1 },
  { key: "fwdChh", label: "Plus CHH", channel: "chh", index: 2 },
  { key: "fwdDepth", label: "Plus depth", channel: "depth", index: 3 },
  { key: "revCpg", label: "Minus CpG", channel: "cpg", index: 4 },
  { key: "revChg", label: "Minus CHG", channel: "chg", index: 5 },
  { key: "revChh", label: "Minus CHH", channel: "chh", index: 6 },
  { key: "revDepth", label: "Minus depth", channel: "depth", index: 7 },
];
export const MethylCTooltip: TrackTooltipComponent<MethylCTooltipItem, MethylCConfig> = ({
  item,
  context,
}) => {
  const visible: TrackTooltipRow[] = rows
    .filter(({ key }) => item.showRows[key])
    .map(({ label, channel, index }) => ({
      label,
      value: formatSignalValue(item.tooltipValues[index]?.max),
      color: context.config.colors[channel],
    }));
  return (
    <TrackTooltip
      rows={visible.length ? visible : [{ label: "Channels", value: "None enabled" }]}
    />
  );
};
