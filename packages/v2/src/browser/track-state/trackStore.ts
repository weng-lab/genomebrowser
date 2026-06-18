import { create, type StoreApi, type UseBoundStore } from "zustand";
import { createModuleRegistry } from "../../modules/registry";
import type { AnyTrackModule, TrackConfigBase, TrackMutationResult } from "../../modules/types";

export type TrackStoreOptions<Config extends TrackConfigBase = TrackConfigBase> = {
  modules: AnyTrackModule[];
  tracks?: Config[];
};

export type TrackUpdate<Config extends TrackConfigBase = TrackConfigBase> = Partial<Config>;

export type TrackStore = {
  tracks: TrackConfigBase[];
  order: string[];
  setTracks: <Config extends TrackConfigBase>(tracks: Config[]) => TrackMutationResult;
  addTrack: <Config extends TrackConfigBase>(track: Config, index?: number) => TrackMutationResult;
  removeTrack: (id: string) => TrackMutationResult;
  reorderTracks: (ids: string[]) => TrackMutationResult;
  updateTrack: <Config extends TrackConfigBase>(
    id: string,
    partial: TrackUpdate<Config>,
  ) => TrackMutationResult;
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
      const result = getValidatedTracks(tracks, registry);
      if (!result.ok) return result;
      const duplicateResult = getUniqueTrackIdsResult(result.tracks);
      if (!duplicateResult.ok) return duplicateResult;
      const validatedTracks = result.tracks;
      set({ tracks: validatedTracks, order: validatedTracks.map((track) => track.id) });
      return mutationOk;
    },
    addTrack: (track, index) => {
      const result = getValidatedTrack(track, registry);
      if (!result.ok) return result;
      const validatedTrack = result.track;
      const tracks = [...get().tracks];
      if (tracks.some((existing) => existing.id === validatedTrack.id)) {
        return mutationError(`Duplicate track id: ${validatedTrack.id}`);
      }
      tracks.splice(index ?? tracks.length, 0, validatedTrack);
      set({ tracks, order: tracks.map((item) => item.id) });
      return mutationOk;
    },
    removeTrack: (id) => {
      if (!get().tracks.some((track) => track.id === id)) {
        return mutationError(`No track found for id: ${id}`);
      }
      const tracks = get().tracks.filter((track) => track.id !== id);
      set({ tracks, order: tracks.map((track) => track.id) });
      return mutationOk;
    },
    reorderTracks: (ids) => {
      const tracksById = new Map(get().tracks.map((track) => [track.id, track]));
      const result = getValidOrderResult(ids, tracksById);
      if (!result.ok) return result;
      set({
        tracks: ids.map((id) => tracksById.get(id)!),
        order: ids,
      });
      return mutationOk;
    },
    updateTrack: (id, partial) => {
      const currentTrack = get().tracks.find((track) => track.id === id);
      if (!currentTrack) return mutationError(`No track found for id: ${id}`);
      if (partial.type !== undefined && partial.type !== currentTrack.type) {
        return mutationError("Track type cannot be changed");
      }
      const result = getValidatedTrack(
        { ...currentTrack, ...partial, id: currentTrack.id, type: currentTrack.type },
        registry,
      );
      if (!result.ok) return result;

      set((state) => ({
        tracks: state.tracks.map((track) => (track.id === id ? result.track : track)),
        order: state.order,
      }));
      return mutationOk;
    },
    getTrack: (id) => get().tracks.find((track) => track.id === id),
  }));
}

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;
type ValidatedTrackResult = { ok: true; track: TrackConfigBase } | { ok: false; error: string };
type ValidatedTracksResult = { ok: true; tracks: TrackConfigBase[] } | { ok: false; error: string };

function validateTrack(track: TrackConfigBase, registry: ModuleRegistry): TrackConfigBase {
  return registry.get(track.type).validate(track);
}

function validateTracks(tracks: TrackConfigBase[], registry: ModuleRegistry): TrackConfigBase[] {
  return tracks.map((track) => validateTrack(track, registry));
}

const mutationOk = { ok: true } as const satisfies TrackMutationResult;

function mutationError(error: string): TrackMutationResult {
  return { ok: false, error };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getValidatedTrack(track: TrackConfigBase, registry: ModuleRegistry): ValidatedTrackResult {
  try {
    return { ok: true as const, track: validateTrack(track, registry) };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

function getValidatedTracks(
  tracks: TrackConfigBase[],
  registry: ModuleRegistry,
): ValidatedTracksResult {
  try {
    return { ok: true as const, tracks: validateTracks(tracks, registry) };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

function getUniqueTrackIdsResult(tracks: TrackConfigBase[]) {
  try {
    assertUniqueTrackIds(tracks);
    return mutationOk;
  } catch (error) {
    return mutationError(getErrorMessage(error));
  }
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

function getValidOrderResult(
  ids: string[],
  tracksById: Map<string, TrackConfigBase>,
): TrackMutationResult {
  if (ids.length !== tracksById.size) {
    return mutationError("Invalid track order");
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id) || !tracksById.has(id)) {
      return mutationError("Invalid track order");
    }
    seen.add(id);
  }
  return mutationOk;
}
