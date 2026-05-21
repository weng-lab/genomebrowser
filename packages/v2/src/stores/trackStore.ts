import { create, type StoreApi, type UseBoundStore } from "zustand";
import { createModuleRegistry } from "../modules/registry";
import type { AnyTrackModule, TrackConfigBase } from "../modules/types";

export type TrackStoreOptions<Config extends TrackConfigBase = TrackConfigBase> = {
  modules: AnyTrackModule[];
  tracks?: Config[];
};

export type TrackUpdate<Config extends TrackConfigBase = TrackConfigBase> = Partial<Config>;

export type TrackStore = {
  tracks: TrackConfigBase[];
  order: string[];
  setTracks: <Config extends TrackConfigBase>(tracks: Config[]) => void;
  addTrack: <Config extends TrackConfigBase>(track: Config, index?: number) => void;
  removeTrack: (id: string) => void;
  reorderTracks: (ids: string[]) => void;
  updateTrack: <Config extends TrackConfigBase>(id: string, partial: TrackUpdate<Config>) => void;
  getTrack: (id: string) => TrackConfigBase | undefined;
};

export type TrackStoreInstance = UseBoundStore<StoreApi<TrackStore>>;

export function createTrackStore<Config extends TrackConfigBase = TrackConfigBase>(
  options: TrackStoreOptions<Config>,
): TrackStoreInstance {
  const registry = createModuleRegistry(options.modules);
  const initialTracks = validateTracks(options.tracks ?? [], registry);
  assertUniqueTrackIds(initialTracks);

  return create<TrackStore>((set, get) => ({
    tracks: initialTracks,
    order: initialTracks.map((track) => track.id),
    setTracks: (tracks) => {
      const validatedTracks = validateTracks(tracks, registry);
      assertUniqueTrackIds(validatedTracks);
      set({ tracks: validatedTracks, order: validatedTracks.map((track) => track.id) });
    },
    addTrack: (track, index) => {
      const validatedTrack = validateTrack(track, registry);
      const tracks = [...get().tracks];
      if (tracks.some((existing) => existing.id === validatedTrack.id)) {
        throw new Error(`Duplicate track id: ${validatedTrack.id}`);
      }
      tracks.splice(index ?? tracks.length, 0, validatedTrack);
      set({ tracks, order: tracks.map((item) => item.id) });
    },
    removeTrack: (id) => {
      const tracks = get().tracks.filter((track) => track.id !== id);
      set({ tracks, order: tracks.map((track) => track.id) });
    },
    reorderTracks: (ids) => {
      const tracksById = new Map(get().tracks.map((track) => [track.id, track]));
      assertValidOrder(ids, tracksById);
      set({
        tracks: ids.map((id) => tracksById.get(id)!),
        order: ids,
      });
    },
    updateTrack: (id, partial) => {
      set((state) => ({
        tracks: state.tracks.map((track) => {
          if (track.id !== id) return track;
          if (partial.type !== undefined && partial.type !== track.type) {
            throw new Error("Track type cannot be changed");
          }
          return validateTrack({ ...track, ...partial, id: track.id, type: track.type }, registry);
        }),
        order: state.order,
      }));
    },
    getTrack: (id) => get().tracks.find((track) => track.id === id),
  }));
}

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;

function validateTrack(track: TrackConfigBase, registry: ModuleRegistry): TrackConfigBase {
  return registry.get(track.type).validate(track);
}

function validateTracks(tracks: TrackConfigBase[], registry: ModuleRegistry): TrackConfigBase[] {
  return tracks.map((track) => validateTrack(track, registry));
}

function assertUniqueTrackIds(tracks: TrackConfigBase[]) {
  const ids = new Set<string>();
  for (const track of tracks) {
    if (ids.has(track.id)) {
      throw new Error(`Duplicate track id: ${track.id}`);
    }
    ids.add(track.id);
  }
}

function assertValidOrder(ids: string[], tracksById: Map<string, TrackConfigBase>) {
  if (ids.length !== tracksById.size) {
    throw new Error("Invalid track order");
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id) || !tracksById.has(id)) {
      throw new Error("Invalid track order");
    }
    seen.add(id);
  }
}
