import { create, type StoreApi, type UseBoundStore } from "zustand";
import { createModuleRegistry, type ModuleRegistry } from "../../modules/registry";
import type {
  AnyTrackModule,
  TrackBase,
  TrackInstance,
  TrackInteraction,
  TrackMutationResult,
} from "../../modules/types";

type AnyTrackInstance = TrackInstance<any, any>;

export type TrackStoreOptions<Track extends AnyTrackInstance = AnyTrackInstance> = {
  modules: AnyTrackModule[];
  tracks?: Track[];
};

export type TrackConfigUpdate<Config> = Partial<Config>;
export type TrackInteractionUpdate<Item> = Partial<TrackInteraction<Item>>;

export type TrackStore = {
  tracks: AnyTrackInstance[];
  order: string[];
  registry: ModuleRegistry;
  setTracks: <Track extends AnyTrackInstance>(tracks: Track[]) => TrackMutationResult;
  addTrack: <Track extends AnyTrackInstance>(track: Track, index?: number) => TrackMutationResult;
  removeTrack: (id: string) => TrackMutationResult;
  reorderTracks: (ids: string[]) => TrackMutationResult;
  updateBase: (id: string, partial: Partial<TrackBase>) => TrackMutationResult;
  updateConfig: <Config>(id: string, partial: TrackConfigUpdate<Config>) => TrackMutationResult;
  updateInteraction: <Item>(
    id: string,
    partial: TrackInteractionUpdate<Item>,
  ) => TrackMutationResult;
  getTrack: (id: string) => AnyTrackInstance | undefined;
};

export type TrackStoreInstance = UseBoundStore<StoreApi<TrackStore>>;

export function createTrackStore<Track extends AnyTrackInstance = AnyTrackInstance>(
  options: TrackStoreOptions<Track>,
): TrackStoreInstance {
  const registry = createModuleRegistry(options.modules);
  const initialTracks = validateTracks(options.tracks ?? [], registry);
  assertUniqueTrackIds(initialTracks);

  return create<TrackStore>((set, get) => ({
    tracks: initialTracks,
    order: initialTracks.map(getTrackId),
    registry,
    setTracks: (tracks) => {
      const result = getValidatedTracks(tracks, registry);
      if (!result.ok) return result;
      const duplicateResult = getUniqueTrackIdsResult(result.tracks);
      if (!duplicateResult.ok) return duplicateResult;
      const validatedTracks = result.tracks;
      set({ tracks: validatedTracks, order: validatedTracks.map(getTrackId) });
      return mutationOk;
    },
    addTrack: (track, index) => {
      const result = getValidatedTrack(track, registry);
      if (!result.ok) return result;
      const validatedTrack = result.track;
      const tracks = [...get().tracks];
      const trackId = getTrackId(validatedTrack);
      if (tracks.some((existing) => getTrackId(existing) === trackId)) {
        return mutationError(`Duplicate track id: ${trackId}`);
      }
      tracks.splice(index ?? tracks.length, 0, validatedTrack);
      set({ tracks, order: tracks.map(getTrackId) });
      return mutationOk;
    },
    removeTrack: (id) => {
      if (!get().tracks.some((track) => getTrackId(track) === id)) {
        return mutationError(`No track found for id: ${id}`);
      }
      const tracks = get().tracks.filter((track) => getTrackId(track) !== id);
      set({ tracks, order: tracks.map(getTrackId) });
      return mutationOk;
    },
    reorderTracks: (ids) => {
      const tracksById = new Map(get().tracks.map((track) => [getTrackId(track), track]));
      const result = getValidOrderResult(ids, tracksById);
      if (!result.ok) return result;
      set({
        tracks: ids.map((id) => tracksById.get(id)!),
        order: ids,
      });
      return mutationOk;
    },
    updateBase: (id, partial) => {
      const currentTrack = get().tracks.find((track) => getTrackId(track) === id);
      if (!currentTrack) return mutationError(`No track found for id: ${id}`);
      const result = getValidatedTrack(
        {
          ...currentTrack,
          base: { ...currentTrack.base, ...partial, id: currentTrack.base.id },
        },
        registry,
      );
      if (!result.ok) return result;

      set((state) => ({
        tracks: state.tracks.map((track) => (getTrackId(track) === id ? result.track : track)),
        order: state.order,
      }));
      return mutationOk;
    },
    updateConfig: (id, partial) => {
      const currentTrack = get().tracks.find((track) => getTrackId(track) === id);
      if (!currentTrack) return mutationError(`No track found for id: ${id}`);
      const result = getValidatedTrack(
        {
          ...currentTrack,
          config: { ...currentTrack.config, ...partial },
        },
        registry,
      );
      if (!result.ok) return result;

      set((state) => ({
        tracks: state.tracks.map((track) => (getTrackId(track) === id ? result.track : track)),
        order: state.order,
      }));
      return mutationOk;
    },
    updateInteraction: (id, partial) => {
      const currentTrack = get().tracks.find((track) => getTrackId(track) === id);
      if (!currentTrack) return mutationError(`No track found for id: ${id}`);
      const interaction = { ...currentTrack.interaction, ...partial };
      const result = getValidatedTrack(
        {
          ...currentTrack,
          interaction,
        },
        registry,
      );
      if (!result.ok) return result;

      set((state) => ({
        tracks: state.tracks.map((track) => (getTrackId(track) === id ? result.track : track)),
        order: state.order,
      }));
      return mutationOk;
    },
    getTrack: (id) => get().tracks.find((track) => getTrackId(track) === id),
  }));
}

type ValidatedTrackResult = { ok: true; track: AnyTrackInstance } | { ok: false; error: string };
type ValidatedTracksResult =
  | { ok: true; tracks: AnyTrackInstance[] }
  | { ok: false; error: string };

function getTrackId(track: AnyTrackInstance) {
  return track.base.id;
}

function validateTrack(track: AnyTrackInstance, registry: ModuleRegistry): AnyTrackInstance {
  return registry.get(track.type).validate(track);
}

function validateTracks(tracks: AnyTrackInstance[], registry: ModuleRegistry): AnyTrackInstance[] {
  return tracks.map((track) => validateTrack(track, registry));
}

const mutationOk = { ok: true } as const satisfies TrackMutationResult;

function mutationError(error: string): TrackMutationResult {
  return { ok: false, error };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getValidatedTrack(
  track: AnyTrackInstance,
  registry: ModuleRegistry,
): ValidatedTrackResult {
  try {
    return { ok: true as const, track: validateTrack(track, registry) };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

function getValidatedTracks(
  tracks: AnyTrackInstance[],
  registry: ModuleRegistry,
): ValidatedTracksResult {
  try {
    return { ok: true as const, tracks: validateTracks(tracks, registry) };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

function getUniqueTrackIdsResult(tracks: AnyTrackInstance[]) {
  try {
    assertUniqueTrackIds(tracks);
    return mutationOk;
  } catch (error) {
    return mutationError(getErrorMessage(error));
  }
}

function assertUniqueTrackIds(tracks: AnyTrackInstance[]) {
  const ids = new Set<string>();
  for (const track of tracks) {
    const trackId = getTrackId(track);
    if (ids.has(trackId)) {
      throw new Error(`Duplicate track id: ${trackId}`);
    }
    ids.add(trackId);
  }
}

function getValidOrderResult(
  ids: string[],
  tracksById: Map<string, AnyTrackInstance>,
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
