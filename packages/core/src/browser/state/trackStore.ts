import {
  getTrackPlacement,
  type TrackMoveSource,
  type TrackMoveDestination,
} from "./trackPlacement";
import {
  parseTrackSet,
  validateTrackSets,
  retainTrackSets,
  orderTrackSets,
  isContiguousOrder,
  type TrackSet,
  type TrackSetInput,
} from "./trackSets";
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
  trackSets?: readonly TrackSetInput[];
  hiddenTrackIds?: readonly string[];
  /** Track IDs pinned at the top, in order. Missing IDs are reserved for later additions. */
  pinnedTrackIds?: readonly string[];
};

export type TrackStore<Modules extends readonly AnyTrackModule[] = readonly AnyTrackModule[]> = {
  tracks: AnyTrackInstance[];
  trackSets: readonly TrackSet[];
  hiddenTrackIds: readonly string[];
  createTrackSet: (input: TrackSetInput) => TrackMutationResult;
  updateTrackSet: (
    id: string,
    update: Partial<Pick<TrackSet, "title" | "visible">>,
  ) => TrackMutationResult;
  updateTrackSetDisplay: (id: string, display: string) => TrackMutationResult;
  ungroupTrackSet: (id: string) => TrackMutationResult;
  moveTrackItem: (
    source: TrackMoveSource,
    destination: TrackMoveDestination,
  ) => TrackMutationResult;
  moveTrackSet: (id: string, direction: "up" | "down") => TrackMutationResult;
  setTrackVisibility: (id: string, visible: boolean) => TrackMutationResult;
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

  const trackSets = (options.trackSets ?? []).map((input) => {
    const parsed = parseTrackSet(input);
    if (!parsed.success) throw new Error(parsed.error.message);
    return parsed.data;
  });
  const membership = validateTrackSets(trackSets, initialTracks);
  if (!membership.ok) throw new Error(membership.error);
  const initialIds = new Set(initialTracks.map((track) => track.base.id));
  const hiddenTrackIds = [...new Set(options.hiddenTrackIds)].filter((id) => initialIds.has(id));
  const pinnedTrackIds = [...new Set(options.pinnedTrackIds)];

  return create<TrackStore<Modules>>((set, get) => {
    function commitMembership(tracks: AnyTrackInstance[]): TrackMutationResult {
      const result = getUniqueTrackIdsResult(tracks);
      if (!result.ok) return result;
      const state = get();
      const trackSets = retainTrackSets(state.trackSets, tracks);
      const valid = validateTrackSets(trackSets, tracks);
      if (!valid.ok) return valid;
      const ids = new Set(tracks.map((track) => track.base.id));
      const hiddenTrackIds = state.hiddenTrackIds.filter((id) => ids.has(id));
      set({
        ...getOrderedTracks(tracks, state.pinnedTrackIds, trackSets),
        trackSets,
        hiddenTrackIds:
          hiddenTrackIds.length === state.hiddenTrackIds.length
            ? state.hiddenTrackIds
            : hiddenTrackIds,
      });
      return mutationOk;
    }

    return {
      ...getOrderedTracks(initialTracks, pinnedTrackIds, trackSets),
      trackSets,
      hiddenTrackIds,
      pinnedTrackIds,
      setPinnedTrackIds: (ids) => {
        const pinnedTrackIds = [...new Set(ids)];
        set({ ...getOrderedTracks(get().tracks, pinnedTrackIds, get().trackSets), pinnedTrackIds });
        return mutationOk;
      },
      registry,
      createTrackSet: (input) => {
        const parsed = parseTrackSet(input);
        if (!parsed.success) return mutationError("INVALID_TRACK_SET", parsed.error.message);
        const state = get();
        const trackSets = [...state.trackSets, parsed.data];
        const valid = validateTrackSets(trackSets, state.tracks);
        if (!valid.ok) return valid;
        set({ ...getOrderedTracks(state.tracks, state.pinnedTrackIds, trackSets), trackSets });
        return mutationOk;
      },
      updateTrackSet: (id, update) => {
        const state = get();
        const current = state.trackSets.find((set) => set.id === id);
        if (!current)
          return mutationError("TRACK_SET_NOT_FOUND", `No track set found for id: ${id}`);
        const parsed = parseTrackSet({
          ...current,
          ...update,
          id: current.id,
          trackIds: current.trackIds,
        });
        if (!parsed.success) return mutationError("INVALID_TRACK_SET", parsed.error.message);
        set({ trackSets: state.trackSets.map((set) => (set.id === id ? parsed.data : set)) });
        return mutationOk;
      },
      ungroupTrackSet: (id) => {
        const state = get();
        if (!state.trackSets.some((set) => set.id === id))
          return mutationError("TRACK_SET_NOT_FOUND", `No track set found for id: ${id}`);
        set({ trackSets: state.trackSets.filter((set) => set.id !== id) });
        return mutationOk;
      },
      updateTrackSetDisplay: (id, display) => {
        const state = get();
        const group = state.trackSets.find((set) => set.id === id);
        if (!group) return mutationError("TRACK_SET_NOT_FOUND", `No track set found for id: ${id}`);
        const members = new Set(group.trackIds);
        const next: AnyTrackInstance[] = [];
        for (const track of state.tracks) {
          if (!members.has(track.base.id)) {
            next.push(track);
            continue;
          }
          const parsed = getValidatedTrack(
            { ...track, base: { ...track.base, display } },
            state.registry,
          );
          if (!parsed.ok) return parsed;
          next.push(parsed.track);
        }
        set({ tracks: next });
        return mutationOk;
      },
      setTrackVisibility: (id, visible) => {
        const state = get();
        if (!state.tracks.some((track) => track.base.id === id))
          return mutationError("TRACK_NOT_FOUND", `No track found for id: ${id}`);
        const hidden = state.hiddenTrackIds.includes(id);
        if (visible === !hidden) return mutationOk;
        set({
          hiddenTrackIds: visible
            ? state.hiddenTrackIds.filter((value) => value !== id)
            : [...state.hiddenTrackIds, id],
        });
        return mutationOk;
      },
      moveTrackItem: (source, destination) => {
        const result = getTrackPlacement(get(), source, destination);
        if (!result.ok) return result;
        if (result.state) set(result.state);
        return mutationOk;
      },
      moveTrackSet: (id, direction) => {
        const state = get();
        const group = state.trackSets.find((set) => set.id === id);
        if (!group) return mutationError("TRACK_SET_NOT_FOUND", `No track set found for id: ${id}`);
        const pinned = new Set(state.pinnedTrackIds);
        if (group.trackIds.some((id) => pinned.has(id)))
          return mutationError("INTERACTION_BLOCKED", "Unpin the track set before moving it.");
        const owners = new Map(
          state.trackSets.flatMap((set) => set.trackIds.map((id) => [id, set] as const)),
        );
        const blocks: { id: string; trackIds: string[] }[] = [];
        for (const trackId of state.order) {
          const owner = owners.get(trackId);
          const blockId = owner?.id ?? trackId;
          const last = blocks.at(-1);
          if (owner && last?.id === blockId) last.trackIds.push(trackId);
          else blocks.push({ id: blockId, trackIds: [trackId] });
        }
        const index = blocks.findIndex((block) => block.id === id);
        const target = index + (direction === "up" ? -1 : 1);
        if (
          target < 0 ||
          target >= blocks.length ||
          blocks[target].trackIds.some((id) => pinned.has(id))
        )
          return mutationOk;
        [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
        return state.reorderTracks(blocks.flatMap((block) => block.trackIds));
      },
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
        return commitMembership(tracks);
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
        if (!isContiguousOrder(ids, get().trackSets))
          return mutationError("INVALID_TRACK_ORDER", "Track set members must remain together.");
        set(
          getOrderedTracks(
            ids.map((id) => tracksById.get(id)!),
            get().pinnedTrackIds,
            get().trackSets,
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
            config: { ...currentConfig, ...update.config },
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
    };
  });
}

function getOrderedTracks(
  tracks: AnyTrackInstance[],
  pinnedTrackIds: readonly string[],
  trackSets: readonly TrackSet[] = [],
) {
  if (trackSets.length) {
    const ordered = orderTrackSets(tracks, pinnedTrackIds, trackSets);
    return { tracks: ordered, order: ordered.map(getTrackId) };
  }
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
