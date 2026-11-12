import { BigRmskSummary } from "./joined/summary";
import type { TrackRendererProps } from "@weng-lab/genomebrowser";
import {
  FullStandardRepeatMasker,
  PackedStandardRepeatMasker,
  DenseStandardRepeatMasker,
} from "./standard/render";
import { FullBigRmsk, PackedBigRmsk, DenseBigRmsk } from "./joined/render";
import { standardConfig, joinedConfig, type RepeatMaskerConfig } from "./schema";
import type { RepeatMaskerData } from "./types";

type Props = TrackRendererProps<RepeatMaskerConfig, RepeatMaskerData>;
type Mode = "full" | "pack" | "dense";
const standardRenderers = {
  full: FullStandardRepeatMasker,
  pack: PackedStandardRepeatMasker,
  dense: DenseStandardRepeatMasker,
};
const joinedRenderers = { full: FullBigRmsk, pack: PackedBigRmsk, dense: DenseBigRmsk };
export function FullRepeatMasker(props: Props) {
  return <RepeatMaskerRows {...props} mode="full" />;
}
export function PackedRepeatMasker(props: Props) {
  return <RepeatMaskerRows {...props} mode="pack" />;
}
export function DenseRepeatMasker(props: Props) {
  return <RepeatMaskerRows {...props} mode="dense" />;
}
function RepeatMaskerRows({ mode, ...props }: Props & { mode: Mode }) {
  const { config, data } = props;
  const view = data.view === "standard" ? "standard" : "joined";
  // Core may retain a ready result while the next configuration starts loading.
  // Never interpret that result using a different source's layout.
  if (view !== config.view || data.url !== config.sources[view]) return null;
  const Standard = standardRenderers[mode];
  const Joined = joinedRenderers[mode];
  return (
    <g data-repeatmasker-view={config.view} data-repeatmasker-arrows={config.showStrandArrows}>
      <style>{`
        [data-repeatmasker-view][data-repeatmasker-arrows="false"] [data-repeatmasker-strand],
        [data-repeatmasker-view][data-repeatmasker-arrows="false"] [data-bigrmsk-strand] { display: none; }
      `}</style>
      {data.view === "joined" ? (
        <Joined {...props} config={joinedConfig(config)} data={data.data} />
      ) : data.view === "joined-summary" ? (
        <BigRmskSummary {...props} config={joinedConfig(config)} data={data.data} />
      ) : (
        <Standard
          {...props}
          config={{ ...standardConfig(config), url: data.url }}
          data={data.data}
        />
      )}
    </g>
  );
}
