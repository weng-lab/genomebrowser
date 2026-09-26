import { createContext, use } from "react";
import type {
  AnyTrackInteraction,
  TrackInteractionCallback,
  TrackRendererInteraction,
  TrackRuntimeContext,
} from "./types";

/** What a mounted renderer can read about its own track. */
export type TrackRuntimeValue = {
  context: TrackRuntimeContext;
  interaction: TrackRendererInteraction<never> | null;
};

export const TrackRuntime = createContext<TrackRuntimeValue | null>(null);

export function useInteraction<Item>(): TrackRendererInteraction<Item> | null {
  // The context funnels callbacks authored against each module's Item through one
  // untyped channel; the renderer requesting Item belongs to the module that set them.
  return (use(TrackRuntime)?.interaction ?? null) as TrackRendererInteraction<Item> | null;
}

export function useTrackRuntimeContext<Config>(): TrackRuntimeContext<Config> {
  const runtime = use(TrackRuntime);
  if (!runtime) throw new Error("Track runtime context must be used within a track renderer");
  return runtime.context as TrackRuntimeContext<Config>;
}

export function bindTrackInteraction(
  interaction: AnyTrackInteraction | undefined,
  context: TrackRuntimeContext,
): TrackRendererInteraction<never> | null {
  if (!interaction) return null;

  const onClick = interaction.onClick as TrackInteractionCallback<unknown> | undefined;
  const onHover = interaction.onHover as TrackInteractionCallback<unknown> | undefined;
  const onLeave = interaction.onLeave as TrackInteractionCallback<unknown> | undefined;

  return {
    ...(onClick ? { onClick: (item: never) => onClick(item, context) } : {}),
    ...(onHover ? { onHover: (item: never) => onHover(item, context) } : {}),
    ...(onLeave ? { onLeave: (item: never) => onLeave(item, context) } : {}),
  };
}
