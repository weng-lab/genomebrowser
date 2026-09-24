import { TrackTooltip } from "../shared/tooltips";
import type { DynseqPoint } from "./types";

export function DynseqTooltip({ item }: { item: DynseqPoint }) {
  return (
    <TrackTooltip
      title={item.base.toUpperCase()}
      rows={[
        { label: "Position", value: item.position.toLocaleString("en-US") },
        { label: "Score", value: item.score.toFixed(4) },
      ]}
    />
  );
}
