import { createContext, createElement, useContext } from "react";
import type { ReactNode } from "react";
import type { TrackInteraction } from "./types";

const interactionContext = createContext<TrackInteraction | null>(null);

export function TrackInteractionProvider({
  interaction,
  children,
}: {
  interaction?: TrackInteraction;
  children: ReactNode;
}) {
  return createElement(
    interactionContext.Provider,
    { value: interaction ?? null },
    children,
  );
}

export function useInteraction<InteractionItem>() {
  return useContext(
    interactionContext,
  ) as TrackInteraction<InteractionItem> | null;
}
