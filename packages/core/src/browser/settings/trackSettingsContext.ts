import { createContext, use } from "react";

export const TrackSettingsBlockedContext = createContext<boolean | undefined>(undefined);

/** Loading state for hosted settings; undefined when a form is rendered independently. */
export function useTrackSettingsBlocked(): boolean | undefined {
  return use(TrackSettingsBlockedContext);
}
