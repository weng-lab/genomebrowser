import { create, type StoreApi, type UseBoundStore } from "zustand";
import { validateTrackConfigBase, validateTrackConfigBaseList } from "../modules/schemas";
import type { TrackConfigBase } from "../modules/types";

export type TrackStore = {
  tracks: TrackConfigBase[];
  order: string[];
  setTracks: (tracks: TrackConfigBase[]) => void;
  addTrack: (track: TrackConfigBase, index?: number) => void;
  removeTrack: (id: string) => void;
  reorderTracks: (ids: string[]) => void;
  updateTrack: (id: string, partial: Partial<TrackConfigBase>) => void;
  getTrack: (id: string) => TrackConfigBase | undefined;
};

export type TrackStoreInstance = UseBoundStore<StoreApi<TrackStore>>;

export function createTrackStore(initialTracks: TrackConfigBase[] = []): TrackStoreInstance {
  validateTrackConfigBaseList(initialTracks, "Track store input");
  assertUniqueTrackIds(initialTracks);
  return create<TrackStore>((set, get) => ({
    tracks: initialTracks,
    order: initialTracks.map((track) => track.id),
    setTracks: (tracks) => {
      validateTrackConfigBaseList(tracks, "Track list");
      assertUniqueTrackIds(tracks);
      set({ tracks, order: tracks.map((track) => track.id) });
    },
    addTrack: (track, index) => {
      validateTrackConfigBase(track, "Track");
      const tracks = [...get().tracks];
      if (tracks.some((existing) => existing.id === track.id)) {
        throw new Error(`Duplicate track id: ${track.id}`);
      }
      tracks.splice(index ?? tracks.length, 0, track);
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
        tracks: state.tracks.map((track) =>
          track.id === id ? validateTrackConfigBase({ ...track, ...partial, id: track.id }, "Track") : track,
        ),
        order: state.order,
      }));
    },
    getTrack: (id) => get().tracks.find((track) => track.id === id),
  }));
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
