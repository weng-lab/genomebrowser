import { isCompositeTrack, type CompositeInput } from "../../modules/composite";
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
  groupTracks: (
    input: Omit<CompositeInput, "tracks" | "base"> & {
      id: string;
      title: string;
      trackIds: string[];
      base?: Omit<CompositeInput["base"], "id" | "title">;
    },
  ) => TrackMutationResult;
  extractTracks: (id: string, trackIds: string[]) => TrackMutationResult;
  ungroupTrack: (id: string) => TrackMutationResult;
  reorderChildren: (id: string, trackIds: string[]) => TrackMutationResult;
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
  const initialPins = validatePins(initialTracks, pinnedTrackIds);
  if (!initialPins.ok) throw new Error(initialPins.error);

  return create<TrackStore<Modules>>((set, get) => {
    function commitMembership(tracks: AnyTrackInstance[]): TrackMutationResult {
      const result = getUniqueTrackIdsResult(tracks);
      if (!result.ok) return result;
      const pins = validatePins(tracks, get().pinnedTrackIds);
      if (!pins.ok) return pins;
      set(getOrderedTracks(tracks, get().pinnedTrackIds));
      return mutationOk;
    }

    return {
      ...getOrderedTracks(initialTracks, pinnedTrackIds),
      pinnedTrackIds,
      setPinnedTrackIds: (ids) => {
        const pinnedTrackIds = [...new Set(ids)];
        const pins = validatePins(get().tracks, pinnedTrackIds);
        if (!pins.ok) return pins;
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
      removeTrack: (id) => get().applyTrackChanges({ remove: [id] }),
      applyTrackChanges: (changes) => {
        const result = getValidatedTracks(changes.add ?? [], registry);
        if (!result.ok) return result;
        const currentTracks = get().tracks;
        const removeIds = new Set(changes.remove ?? []);
        for (const id of removeIds) {
          if (!get().getTrack(id)) {
            return mutationError("TRACK_NOT_FOUND", `No track found for id: ${id}`);
          }
        }
        const tracks = [
          ...currentTracks.flatMap((track) => {
            if (removeIds.has(track.base.id)) return [];
            if (!isCompositeTrack(track, registry)) return [track];
            const children = track.tracks.filter((child) => !removeIds.has(child.base.id));
            return children.length === track.tracks.length
              ? [track]
              : children.length
                ? [{ ...track, tracks: children }]
                : [];
          }),
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
        const currentTrack = get().getTrack(id);
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
        if (currentTrack.tracks) result.track.tracks = currentTrack.tracks;

        set((state) => ({
          tracks: state.tracks.map((track) => {
            if (track.base.id === id) return result.track;
            if (
              !isCompositeTrack(track, registry) ||
              !track.tracks.some((child) => child.base.id === id)
            )
              return track;
            return {
              ...track,
              tracks: track.tracks.map((child) => (child.base.id === id ? result.track : child)),
            };
          }),
          order: state.order,
        }));
        return mutationOk;
      },
      groupTracks: ({ id, title, trackIds, base, ...input }) => {
        const state = get();
        const selected = new Set(trackIds);
        if (!selected.size || selected.size !== trackIds.length)
          return mutationError("INVALID_TRACK", "Select distinct standalone tracks");
        if (state.getTrack(id))
          return mutationError("DUPLICATE_TRACK_ID", `Duplicate track id: ${id}`);
        const children = state.tracks.filter((track) => selected.has(track.base.id));
        if (
          children.length !== selected.size ||
          children.some((track) => isCompositeTrack(track, registry))
        )
          return mutationError("INVALID_TRACK", "Only standalone tracks can be grouped");
        const pinned = new Set(state.pinnedTrackIds);
        if (children.some((track) => pinned.has(track.base.id)))
          return mutationError("INVALID_TRACK", "Pinned tracks cannot be grouped");
        const module = registry.modules.find((module) => module.kind === "composite");
        if (!module || module.kind !== "composite")
          return mutationError(
            "UNKNOWN_TRACK_MODULE",
            "Register a composite module before grouping",
          );
        try {
          const composite = module.create({
            ...input,
            base: { ...base, id, title },
            tracks: children,
          });
          // Validation must not replace the objects being moved.
          composite.tracks = children as typeof composite.tracks;
          const next: AnyTrackInstance[] = [];
          for (const track of state.tracks) {
            if (!selected.has(track.base.id)) next.push(track);
            else if (track === children[0]) next.push(composite);
          }
          return commitMembership(next);
        } catch (error) {
          if (!(error instanceof PublicInputValidationError)) throw error;
          return mutationError("INVALID_TRACK", error.message);
        }
      },
      extractTracks: (id, trackIds) => {
        const state = get();
        const parent = state.tracks.find((track) => track.base.id === id);
        if (!parent || !isCompositeTrack(parent, registry))
          return mutationError("INVALID_TRACK", "Expected a composite track");
        const selected = new Set(trackIds);
        const childIds = new Set(parent.tracks.map((track) => track.base.id));
        if (
          !selected.size ||
          selected.size !== trackIds.length ||
          trackIds.some((id) => !childIds.has(id))
        )
          return mutationError(
            "INVALID_TRACK",
            "Select distinct child tracks belonging to the composite",
          );
        const remaining = parent.tracks.filter((track) => !selected.has(track.base.id));
        const extracted = parent.tracks.filter((track) => selected.has(track.base.id));
        return commitMembership(
          state.tracks.flatMap((track) =>
            track !== parent
              ? [track]
              : [...(remaining.length ? [{ ...parent, tracks: remaining }] : []), ...extracted],
          ),
        );
      },
      ungroupTrack: (id) => {
        const parent = get().getTrack(id);
        if (!parent || !isCompositeTrack(parent, registry))
          return mutationError("INVALID_TRACK", "Expected a composite track");
        return get().extractTracks(
          id,
          parent.tracks.map((track) => track.base.id),
        );
      },
      reorderChildren: (id, ids) => {
        const parent = get().getTrack(id);
        if (!parent || !isCompositeTrack(parent, registry))
          return mutationError("INVALID_TRACK", "Expected a composite track");
        const byId = new Map(parent.tracks.map((track) => [track.base.id, track]));
        const result = getValidOrderResult(ids, byId);
        if (!result.ok) return result;
        return commitMembership(
          get().tracks.map((track) =>
            track !== parent ? track : { ...parent, tracks: ids.map((id) => byId.get(id)!) },
          ),
        );
      },
      getTrack: (id) => {
        for (const track of get().tracks) {
          if (track.base.id === id) return track;
          if (isCompositeTrack(track, registry)) {
            const child = track.tracks.find((child) => child.base.id === id);
            if (child) return child;
          }
        }
        return undefined;
      },
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateTrack(track: AnyTrackInstance, registry: ModuleRegistry): AnyTrackInstance {
  const validated = registry.get(track.type).validate(track);
  if (isCompositeTrack(validated, registry)) {
    validated.tracks = validated.tracks.map((child) => {
      const module = registry.modules.find((module) => module.type === child.type);
      if (!module)
        throw new PublicInputValidationError(`No track module registered for type: ${child.type}`);
      if (module.kind !== "track")
        throw new PublicInputValidationError("Nested composites are not supported");
      return module.validate(child) as typeof child;
    });
  }
  return validated;
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
  for (const track of tracks.flatMap((track) => [track, ...(track.tracks ?? [])])) {
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

function validatePins(tracks: AnyTrackInstance[], ids: readonly string[]): TrackMutationResult {
  const pinned = new Set(ids);
  for (const track of tracks) {
    if (track.tracks?.some((child) => pinned.has(child.base.id)))
      return mutationError(
        "INVALID_TRACK",
        "Child tracks cannot be pinned; pin the composite instead",
      );
  }
  return mutationOk;
}
