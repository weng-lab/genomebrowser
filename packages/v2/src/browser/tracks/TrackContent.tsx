import type { ComponentType } from "react";
import type { DataState } from "../../data/types";
import type { createModuleRegistry } from "../../modules/registry";
import type { TrackConfigBase, TrackRendererProps } from "../../modules/types";
import type { BrowserRegion } from "../../utils/region";
import { ErrorState } from "../ErrorState";
import { LoadingState } from "../LoadingState";
import type { PanDragHandlers } from "../viewport/usePanDrag";

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;

export function TrackContent({
  track,
  dataState,
  registry,
  region,
  width,
  height,
  titleMargin,
  panDrag,
}: {
  track: TrackConfigBase;
  dataState: DataState;
  registry: ModuleRegistry;
  region: BrowserRegion;
  width: number;
  height: number;
  titleMargin: number;
  panDrag?: PanDragHandlers;
}) {
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
    const validatedTrack = module.validate(track);
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
        config={validatedTrack}
        data={dataState.data}
        region={region}
        width={width}
        height={height}
        panDrag={panDrag}
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
