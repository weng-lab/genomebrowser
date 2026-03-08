import { TrackDefinition } from "./types";

const trackRegistry: TrackDefinition[] = [];

export function registerTrack(definition: TrackDefinition): void {
  const existing = trackRegistry.findIndex((d) => d.type === definition.type);
  if (existing !== -1) {
    trackRegistry[existing] = definition;
  } else {
    trackRegistry.push(definition);
  }
}

export function getDefinition(type: string): TrackDefinition | undefined {
  return trackRegistry.find((d) => d.type === type);
}

export function getRegisteredTracks(): readonly TrackDefinition[] {
  return trackRegistry;
}
