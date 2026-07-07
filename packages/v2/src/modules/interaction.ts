import { createContext, createElement, use } from "react";
import type { ReactNode } from "react";
import type { TrackInteraction } from "./types";

const interactionContext = createContext<TrackInteraction<never> | null>(null);

export function TrackInteractionProvider({
  interaction,
  children,
}: {
  interaction?: TrackInteraction<never>;
  children: ReactNode;
}) {
  return createElement(interactionContext.Provider, { value: interaction ?? null }, children);
}

export function useInteraction<Item>(): TrackInteraction<Item> | null {
  // The context funnels callbacks authored against each module's Item through one
  // untyped channel; the renderer requesting Item belongs to the module that set them.
  return use(interactionContext) as TrackInteraction<Item> | null;
}
