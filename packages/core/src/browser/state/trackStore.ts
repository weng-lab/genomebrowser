import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { MutationFailure } from "../../mutation";
import { PublicInputValidationError } from "../../validation";
import { createModuleRegistry, type ModuleRegistry } from "../../modules/registry";
import type {
  AnyTrackInstance,
  AnyTrackInteraction,
  AnyTrackModule,
  TrackMutationResult,
  TrackBaseUpdate,
  TrackMutationErrorCode,
  TrackUpdate,
  TrackUpdater,
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
  /** Merges a patch, or the patch an updater returns for the latest stored track, into one track. */
  updateTrack: <Config, InteractionItem = unknown>(
    id: string,
    update: TrackUpdate<Config, InteractionItem> | TrackUpdater<Config, InteractionItem>,
  ) => TrackMutationResult;
  /** Merges the patch `createUpdate` returns into every selected track, committing all or none. */
  updateTracks: (
    select: (track: AnyTrackInstance) => boolean,
    createUpdate: (track: AnyTrackInstance) => AnyTrackUpdate,
  ) => TrackMutationResult;
  getTrack: (id: string) => AnyTrackInstance | undefined;
};

type AnyTrackUpdate = {
  base?: TrackBaseUpdate;
  config?: unknown;
  interaction?: Partial<AnyTrackInteraction>;
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

  return create<TrackStore<Modules>>((set, get) => {
    function commitMembership(tracks: AnyTrackInstance[]): TrackMutationResult {
      const result = getUniqueTrackIdsResult(tracks);
      if (!result.ok) return result;
      set(getOrderedTracks(tracks, get().pinnedTrackIds));
      return mutationOk;
    }

    return {
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
        return commitMembership(result.tracks);
      },
      addTrack: (track, index) => {
        const result = getValidatedTrack(track, registry);
        if (!result.ok) return result;
        const validatedTrack = result.track;
        const tracks = [...get().tracks];
        tracks.splice(index ?? tracks.length, 0, validatedTrack);
        return commitMembership(tracks);
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
        return commitMembership(tracks);
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
        const patch = typeof update === "function" ? update(currentTrack as never) : update;
        const result = getValidatedTrack(
          mergeTrackUpdate(currentTrack, patch as AnyTrackUpdate),
          registry,
        );
        if (!result.ok) return result;

        set((state) => ({
          tracks: state.tracks.map((track) => (getTrackId(track) === id ? result.track : track)),
          order: state.order,
        }));
        return mutationOk;
      },
      updateTracks: (select, createUpdate) => {
        const updatedTracks = new Map<string, AnyTrackInstance>();
        for (const track of get().tracks) {
          if (!select(track)) continue;
          const result = getValidatedTrack(mergeTrackUpdate(track, createUpdate(track)), registry);
          if (!result.ok) return result;
          updatedTracks.set(getTrackId(track), result.track);
        }
        if (updatedTracks.size === 0) return mutationOk;

        set((state) => ({
          tracks: state.tracks.map((track) => updatedTracks.get(getTrackId(track)) ?? track),
          order: state.order,
        }));
        return mutationOk;
      },
      getTrack: (id) => get().tracks.find((track) => getTrackId(track) === id),
    };
  });
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

function mergeTrackUpdate(
  currentTrack: AnyTrackInstance,
  update: AnyTrackUpdate,
): AnyTrackInstance {
  const currentConfig = isRecord(currentTrack.config) ? currentTrack.config : {};
  const interaction =
    currentTrack.interaction !== undefined || update.interaction !== undefined
      ? { ...currentTrack.interaction, ...update.interaction }
      : undefined;
  return {
    ...currentTrack,
    base: { ...currentTrack.base, ...update.base, id: currentTrack.base.id },
    config: { ...currentConfig, ...(update.config as Record<string, unknown> | undefined) },
    ...(interaction !== undefined ? { interaction } : {}),
  };
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
  const result = getUniqueTrackIdsResult(tracks);
  if (!result.ok) throw new Error(result.error);
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
