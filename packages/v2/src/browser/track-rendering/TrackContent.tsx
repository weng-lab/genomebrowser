import type { ComponentType } from "react";
import type { DataState } from "../track-data/types";
import type { TrackConfigBase, TrackRendererProps } from "../../modules/types";
import type { BrowserRegion } from "../../modules/utils/region";
import { useRegistry } from "../registry/useRegistry";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

export function TrackContent({
  track,
  dataState,
  region,
  width,
  height,
  titleMargin,
}: {
  track: TrackConfigBase;
  dataState: DataState;
  region: BrowserRegion;
  width: number;
  height: number;
  titleMargin: number;
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
        height={height + titleMargin}
        message={dataState.error}
      />
    );
  }

  try {
    const module = registry.get(track.type);
    const Renderer = module.render[track.display] as
      | ComponentType<TrackRendererProps<TrackConfigBase, unknown>>
      | undefined;
    if (!Renderer) {
      return (
        <ErrorState
          x={0}
          y={0}
          width={width}
          height={height}
          message={`Display "${track.display}" is not supported by "${track.type}"`}
        />
      );
    }
    return (
      <Renderer
        config={track}
        data={dataState.data}
        region={region}
        width={width}
        height={height}
      />
    );
  } catch (error) {
    return (
      <ErrorState
        x={0}
        y={0}
        width={width}
        height={height}
        message={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }
}
