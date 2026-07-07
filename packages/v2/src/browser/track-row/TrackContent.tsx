import { memo, type ComponentType } from "react";
import type { DataState } from "../data/types";
import { TrackInteractionProvider } from "../../modules/interaction";
import type { AnyTrackInstance, TrackRendererProps } from "../../modules/types";
import type { BrowserRegion } from "../../modules/utils/region";
import { useRegistry } from "../state/useRegistry";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

export const TrackContent = memo(function TrackContent({
  track,
  dataState,
  region,
  width,
  height,
  titleMargin,
}: {
  track: AnyTrackInstance;
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
      <TrackInteractionProvider interaction={track.interaction}>
        <Renderer
          id={track.base.id}
          config={track.config}
          color={track.base.color}
          data={dataState.data}
          region={region}
          width={width}
          height={height}
        />
      </TrackInteractionProvider>
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
});
