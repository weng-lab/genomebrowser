import { memo, type ComponentType } from "react";
import { TrackRuntimeProvider } from "../../modules/TrackRuntimeProvider";
import type { AnyTrackInstance, TrackRendererProps } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import { useRegistry } from "../state/browserContextState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

/** The parts of a track's data state the content needs to draw. */
export type TrackContentState =
  | { status: "loading" }
  | { status: "ready"; data: unknown }
  | { status: "error"; error: string };

export const TrackContent = memo(function TrackContent({
  track,
  dataState,
  visibleRegion,
  region,
  width,
  height,
}: {
  track: AnyTrackInstance;
  dataState: TrackContentState;
  visibleRegion: GenomicRegion;
  region: GenomicRegion;
  width: number;
  height: number;
}) {
  const registry = useRegistry();

  if (dataState.status === "loading") {
    return <LoadingState x={0} y={0} width={width} height={height} />;
  }
  if (dataState.status === "error") {
    return (
      <ErrorState
        x={0}
        y={0}
        width={width}
        height={height}
        message={`Track "${track.base.title || track.base.id}": ${dataState.error}`}
      />
    );
  }

  const module = registry.get(track.type);
  const Renderer = module.render[track.base.display] as
    | ComponentType<TrackRendererProps<unknown, unknown>>
    | undefined;
  if (!Renderer) {
    return (
      <ErrorState
        x={0}
        y={0}
        width={width}
        height={height}
        message={`Display "${track.base.display}" is not supported by "${track.type}"`}
      />
    );
  }
  return (
    <TrackRuntimeProvider track={track}>
      <Renderer
        id={track.base.id}
        config={track.config}
        color={track.base.color}
        data={dataState.data}
        visibleRegion={visibleRegion}
        region={region}
        width={width}
        height={height}
      />
    </TrackRuntimeProvider>
  );
});
