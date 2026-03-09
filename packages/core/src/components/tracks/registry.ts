import { TrackDefinition } from "./types";

export type TrackRegistry = Map<string, TrackDefinition>;

const legacyTrackRegistry: TrackRegistry = new Map();

export function registerTrack(definition: TrackDefinition): void {
  legacyTrackRegistry.set(definition.type, definition);
}

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

export function getDefinition(type: string): TrackDefinition | undefined;
export function getDefinition(registry: TrackRegistry, type: string): TrackDefinition | undefined;
export function getDefinition(registryOrType: TrackRegistry | string, maybeType?: string): TrackDefinition | undefined {
  if (typeof registryOrType === "string") {
    return legacyTrackRegistry.get(registryOrType);
  }

  return registryOrType.get(maybeType ?? "");
}

export function getRegisteredTracks(): readonly TrackDefinition[];
export function getRegisteredTracks(registry: TrackRegistry): readonly TrackDefinition[];
export function getRegisteredTracks(registry?: TrackRegistry): readonly TrackDefinition[] {
  return Array.from((registry ?? legacyTrackRegistry).values());
}
