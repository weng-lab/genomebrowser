import { TrackDefinition } from "./types";

export type TrackRegistry = Map<string, TrackDefinition>;

export function createTrackRegistry(definitions: readonly TrackDefinition[]): TrackRegistry {
  const registry: TrackRegistry = new Map();

  for (const definition of definitions) {
    if (registry.has(definition.type)) {
      throw new Error(`Duplicate track type registered: ${definition.type}`);
    }
    registry.set(definition.type, definition);
  }

  return registry;
}

export function getDefinition(registry: TrackRegistry, type: string): TrackDefinition | undefined {
  return registry.get(type);
}

export function getRegisteredTracks(registry: TrackRegistry): readonly TrackDefinition[] {
  return Array.from(registry.values());
}
