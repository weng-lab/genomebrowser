import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { MutationFailure } from "../../mutation";
import { PublicInputValidationError } from "../../modules/schemas";
import { createModuleRegistry, type ModuleRegistry } from "../../modules/registry";
import type {
  AnyTrackInstance,
  AnyTrackModule,
  TrackMutationResult,
  TrackMutationErrorCode,
  TrackUpdate,
} from "../../modules/types";

export type TrackStoreOptions<
  Modules extends readonly AnyTrackModule[] = readonly AnyTrackModule[],
  Track extends AnyTrackInstance = AnyTrackInstance,
> = {
  modules: Modules;
  tracks?: Track[];
  /** Track IDs pinned at the top, in order. Missing IDs are reserved for later additions. */
  pinnedTrackIds?: readonly string[];
};

export type TrackStore<Modules extends readonly AnyTrackModule[] = readonly AnyTrackModule[]> = {
  tracks: AnyTrackInstance[];
  order: string[];
  pinnedTrackIds: readonly string[];
  setPinnedTrackIds: (ids: readonly string[]) => TrackMutationResult;
  registry: ModuleRegistry<Modules>;
  setTracks: <Track extends AnyTrackInstance>(tracks: Track[]) => TrackMutationResult;
  addTrack: <Track extends AnyTrackInstance>(track: Track, index?: number) => TrackMutationResult;
  removeTrack: (id: string) => TrackMutationResult;
  applyTrackChanges: <Track extends AnyTrackInstance>(changes: {
    add?: Track[];
    remove?: string[];
  }) => TrackMutationResult;
  reorderTracks: (ids: string[]) => TrackMutationResult;
  updateTrack: <Config, InteractionItem = unknown>(
    id: string,
    update: TrackUpdate<Config, InteractionItem>,
  ) => TrackMutationResult;
  getTrack: (id: string) => AnyTrackInstance | undefined;
};

export type TrackStoreInstance<
  Modules extends readonly AnyTrackModule[] = readonly AnyTrackModule[],
> = UseBoundStore<StoreApi<TrackStore<Modules>>>;

export function createTrackStore<
  const Modules extends readonly AnyTrackModule[],
  Track extends AnyTrackInstance = AnyTrackInstance,
>(options: TrackStoreOptions<Modules, Track>): TrackStoreInstance<Modules> {
  const registry = createModuleRegistry(options.modules);
  const initialTracks = validateTracks(options.tracks ?? [], registry);
  assertUniqueTrackIds(initialTracks);

  const pinnedTrackIds = [...new Set(options.pinnedTrackIds)];

  return create<TrackStore<Modules>>((set, get) => ({
    ...getOrderedTracks(initialTracks, pinnedTrackIds),
    pinnedTrackIds,
    setPinnedTrackIds: (ids) => {
      const pinnedTrackIds = [...new Set(ids)];
      set({ ...getOrderedTracks(get().tracks, pinnedTrackIds), pinnedTrackIds });
      return mutationOk;
    },
    registry,
    setTracks: (tracks) => {
      const result = getValidatedTracks(tracks, registry);
      if (!result.ok) return result;
      const duplicateResult = getUniqueTrackIdsResult(result.tracks);
      if (!duplicateResult.ok) return duplicateResult;
      const validatedTracks = result.tracks;
      set(getOrderedTracks(validatedTracks, get().pinnedTrackIds));
      return mutationOk;
    },
    addTrack: (track, index) => {
      const result = getValidatedTrack(track, registry);
      if (!result.ok) return result;
      const validatedTrack = result.track;
      const tracks = [...get().tracks];
      const trackId = getTrackId(validatedTrack);
      if (tracks.some((existing) => getTrackId(existing) === trackId)) {
        return mutationError("DUPLICATE_TRACK_ID", `Duplicate track id: ${trackId}`);
      }
      tracks.splice(index ?? tracks.length, 0, validatedTrack);
      set(getOrderedTracks(tracks, get().pinnedTrackIds));
      return mutationOk;
    },
    removeTrack: (id) => {
      if (!get().tracks.some((track) => getTrackId(track) === id)) {
        return mutationError("TRACK_NOT_FOUND", `No track found for id: ${id}`);
      }
      const tracks = get().tracks.filter((track) => getTrackId(track) !== id);
      set(getOrderedTracks(tracks, get().pinnedTrackIds));
      return mutationOk;
    },
    applyTrackChanges: (changes) => {
      const result = getValidatedTracks(changes.add ?? [], registry);
      if (!result.ok) return result;
      const currentTracks = get().tracks;
      const removeIds = new Set(changes.remove ?? []);
      for (const id of removeIds) {
        if (!currentTracks.some((track) => getTrackId(track) === id)) {
          return mutationError("TRACK_NOT_FOUND", `No track found for id: ${id}`);
        }
      }
      const tracks = [
        ...currentTracks.filter((track) => !removeIds.has(getTrackId(track))),
        ...result.tracks,
      ];
      const duplicateResult = getUniqueTrackIdsResult(tracks);
      if (!duplicateResult.ok) return duplicateResult;
      set(getOrderedTracks(tracks, get().pinnedTrackIds));
      return mutationOk;
    },
    reorderTracks: (ids) => {
      const tracksById = new Map(get().tracks.map((track) => [getTrackId(track), track]));
      const result = getValidOrderResult(ids, tracksById);
      if (!result.ok) return result;
      set(
        getOrderedTracks(
          ids.map((id) => tracksById.get(id)!),
          get().pinnedTrackIds,
        ),
      );
      return mutationOk;
    },
    updateTrack: (id, update) => {
      const currentTrack = get().tracks.find((track) => getTrackId(track) === id);
      if (!currentTrack) return mutationError("TRACK_NOT_FOUND", `No track found for id: ${id}`);
      const currentConfig = isRecord(currentTrack.config) ? currentTrack.config : {};
      const interaction =
        currentTrack.interaction !== undefined || update.interaction !== undefined
          ? { ...currentTrack.interaction, ...update.interaction }
          : undefined;
      const result = getValidatedTrack(
        {
          ...currentTrack,
          type: currentTrack.type,
          base: {
            ...currentTrack.base,
            ...update.base,
            id: currentTrack.base.id,
          },
          config: mergeConfig(currentConfig, update.config ?? {}),
          ...(interaction !== undefined ? { interaction } : {}),
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

function getOrderedTracks(tracks: AnyTrackInstance[], pinnedTrackIds: readonly string[]) {
  const remaining = new Map(tracks.map((track) => [getTrackId(track), track]));
  const ordered: AnyTrackInstance[] = [];
  for (const id of pinnedTrackIds) {
    const track = remaining.get(id);
    if (track) {
      ordered.push(track);
      remaining.delete(id);
    }
  }
  ordered.push(...remaining.values());
  return { tracks: ordered, order: ordered.map(getTrackId) };
}

type ValidatedTrackResult =
  | { ok: true; track: AnyTrackInstance }
  | MutationFailure<TrackMutationErrorCode>;
type ValidatedTracksResult =
  | { ok: true; tracks: AnyTrackInstance[] }
  | MutationFailure<TrackMutationErrorCode>;

function getTrackId(track: AnyTrackInstance) {
  return track.base.id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateTrack(track: AnyTrackInstance, registry: ModuleRegistry): AnyTrackInstance {
  return registry.get(track.type).validate(track);
}

function validateTracks(tracks: AnyTrackInstance[], registry: ModuleRegistry): AnyTrackInstance[] {
  return tracks.map((track) => validateTrack(track, registry));
}

const mutationOk: TrackMutationResult = { ok: true };

function mutationError(
  code: TrackMutationErrorCode,
  error: string,
): MutationFailure<TrackMutationErrorCode> {
  return { ok: false, code, error };
}

function getValidatedTrack(
  track: AnyTrackInstance,
  registry: ModuleRegistry,
): ValidatedTrackResult {
  if (!isRecord(track) || typeof track.type !== "string") {
    return mutationError("INVALID_TRACK", "Track must be an object with a type.");
  }
  if (!registry.modules.some((module) => module.type === track.type)) {
    return mutationError(
      "UNKNOWN_TRACK_MODULE",
      `No track module registered for type: ${track.type}`,
    );
  }
  try {
    return { ok: true, track: validateTrack(track, registry) };
  } catch (error) {
    if (!(error instanceof PublicInputValidationError)) throw error;
    return mutationError("INVALID_TRACK", error.message);
  }
}

function getValidatedTracks(
  tracks: AnyTrackInstance[],
  registry: ModuleRegistry,
): ValidatedTracksResult {
  const validatedTracks: AnyTrackInstance[] = [];
  for (const track of tracks) {
    const result = getValidatedTrack(track, registry);
    if (!result.ok) return result;
    validatedTracks.push(result.track);
  }
  return { ok: true, tracks: validatedTracks };
}

function getUniqueTrackIdsResult(tracks: AnyTrackInstance[]): TrackMutationResult {
  const ids = new Set<string>();
  for (const track of tracks) {
    const id = getTrackId(track);
    if (ids.has(id)) return mutationError("DUPLICATE_TRACK_ID", `Duplicate track id: ${id}`);
    ids.add(id);
  }
  return mutationOk;
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
    return mutationError("INVALID_TRACK_ORDER", "Invalid track order");
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id) || !tracksById.has(id)) {
      return mutationError("INVALID_TRACK_ORDER", "Invalid track order");
    }
    seen.add(id);
  }
  return mutationOk;
}

function mergeConfig(
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...current };
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    const previous = current[key];
    const merged =
      isPlainConfigObject(previous) && isPlainConfigObject(value)
        ? mergeConfig(previous, value)
        : value;
    Object.defineProperty(result, key, {
      value: merged,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return result;
}
function isPlainConfigObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
