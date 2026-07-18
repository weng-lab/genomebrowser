import { createContext, createElement, use } from "react";
import type { ReactNode } from "react";
import type {
  AnyTrackInteraction,
  TrackInteractionCallback,
  TrackRendererInteraction,
  TrackRuntimeContext,
} from "./types";

const interactionContext = createContext<TrackRendererInteraction<never> | null>(null);

export function TrackInteractionProvider({
  interaction,
  children,
}: {
  interaction?: TrackRendererInteraction<never>;
  children: ReactNode;
}) {
  return createElement(interactionContext.Provider, { value: interaction ?? null }, children);
}

export function useInteraction<Item>(): TrackRendererInteraction<Item> | null {
  // The context funnels callbacks authored against each module's Item through one
  // untyped channel; the renderer requesting Item belongs to the module that set them.
  return use(interactionContext) as TrackRendererInteraction<Item> | null;
}

export function bindTrackInteraction(
  interaction: AnyTrackInteraction | undefined,
  context: TrackRuntimeContext,
): TrackRendererInteraction<never> | undefined {
  if (!interaction) return undefined;

  const onClick = interaction.onClick as TrackInteractionCallback<unknown> | undefined;
  const onHover = interaction.onHover as TrackInteractionCallback<unknown> | undefined;
  const onLeave = interaction.onLeave as TrackInteractionCallback<unknown> | undefined;

  return {
    ...(onClick ? { onClick: (item: never) => onClick(item, context) } : {}),
    ...(onHover ? { onHover: (item: never) => onHover(item, context) } : {}),
    ...(onLeave ? { onLeave: (item: never) => onLeave(item, context) } : {}),
  };
}
