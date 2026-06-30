import { createContext, createElement, use } from "react";
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
  return createElement(interactionContext.Provider, { value: interaction ?? null }, children);
}

export function useInteraction<Item>() {
  return use(interactionContext) as TrackInteraction<Item> | null;
}
