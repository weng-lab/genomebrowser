import type { CaveConfig, CaveTooltipItem, TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { TrackTooltip, type TrackTooltipRow } from "../trackTooltip";
import { formatSignalValue } from "../trackTooltipFormatters";

const defaultCaveColor = "#3333ff";

export const CaveTooltip: TrackTooltipComponent<CaveTooltipItem, CaveConfig> = ({
  item,
  context,
}) => {
  const bottomColor = context.config.bottomColor ?? context.base.color ?? defaultCaveColor;
  const topColor = context.config.topColor ?? lighten(bottomColor, 0.5);
  const rows: TrackTooltipRow[] = [
    { label: "hmC", value: formatSignalValue(item.top?.max), color: topColor },
    { label: "OXBS", value: formatSignalValue(item.bottom?.max), color: bottomColor },
  ];

  return <TrackTooltip rows={rows} />;
};

function lighten(color: string, amount: number) {
  const hex = normalizeHex(color);
  let next = "#";
  for (let i = 0; i < 3; i += 1) {
    const value = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    const channel = Math.round(Math.min(Math.max(0, value + amount * 255), 255)).toString(16);
    next += channel.padStart(2, "0");
  }
  return next;
}

function normalizeHex(color: string) {
  let hex = color.replace(/[^0-9a-f]/gi, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((value) => value + value)
      .join("");
  if (hex.length >= 6) return hex.slice(0, 6);
  return "000000";
}
