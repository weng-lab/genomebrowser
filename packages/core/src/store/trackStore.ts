import { create } from "zustand";
import { Track } from "../components/tracks/types";
import { useMemo } from "react";

export type { Track };

export interface TrackStore {
  tracks: Track[];
  ids: string[];
  setTracks: (tracks: Track[]) => void;
  getTrack: (id: string) => Track | undefined;
  getTrackIndex: (id: string) => number;
  shiftTracks: (id: string, index: number) => void;
  insertTrack: (track: Track, index?: number) => void;
  removeTrack: (id: string) => void;
  createShortLabel: (id: string) => string;
  getIndexByType: (id: string) => number;
  editTrack: <T extends Track>(id: string, partial: Partial<T>) => void;
  editAllTracksByType: <T extends Track>(trackType: string, partial: Partial<T>) => void;
}

export type TrackStoreInstance = ReturnType<typeof createTrackStoreInternal>;

/**
 * @deprecated Use createTrackStoreMemo instead
 */
export const createTrackStore = createTrackStoreInternal;

/**
 * Create a memoized track store to hold track configs.
 * @param tracks - The initial track list
 * @param deps - The dependencies to track for memoization
 * @returns The created store
 */
export function createTrackStoreMemo(tracks: Track[], deps?: React.DependencyList) {
  return useMemo(() => createTrackStoreInternal(tracks), deps ?? []);
}

export function createTrackStoreInternal(tracks: Track[] = []) {
  return create<TrackStore>((set, get) => ({
    tracks,
    ids: tracks.map((track) => track.id),
    setTracks: (tracks: Track[]) => set({ tracks, ids: tracks.map((track) => track.id) }),
    createShortLabel: (id: string) => {
      if (id === "ruler") {
        return "Ruler";
      }
      const track = get().getTrack(id);
      if (!track) {
        throw new Error("Track not found");
      }
      const { title } = track;
      if (!title || !title.substring || !title.length) return "";
      return title.length <= 20 ? title : title.substring(0, 20) + "...";
    },
    getTrackIndex: (id: string) => {
      const state = get();
      return state.tracks.map((track) => track.id).indexOf(id);
    },
    getTrack: (id: string) => {
      const state = get();
      return state.tracks.find((track) => track.id === id);
    },
    shiftTracks: (id: string, index: number) => {
      const state = get();
      const tracks = [...state.tracks];
      const track = tracks.find((track) => track.id === id);
      if (!track) {
        throw new Error("Track not found");
      }
      tracks.splice(state.getTrackIndex(id), 1);
      const realIndex = index === -1 ? tracks.length : index;
      tracks.splice(realIndex, 0, track);
      set({ tracks, ids: tracks.map((track) => track.id) });
    },
    insertTrack: (track: Track, index?: number) => {
      const state = get();
      if (state.getTrack(track.id) !== undefined) return;
      const tracks = [...state.tracks];
      tracks.splice(index || tracks.length, 0, track);
      set({ tracks, ids: tracks.map((track) => track.id) });
    },
    removeTrack: (id: string) => {
      const state = get();
      const tracks = [...state.tracks];
      const index = state.getTrackIndex(id);
      if (index === -1) {
        return;
      }
      tracks.splice(index, 1);
      set({ tracks, ids: tracks.map((track) => track.id) });
    },
    editTrack: <T extends Track>(id: string, partial: Partial<T>): void => {
      set((state) => {
        const updatedTracks = state.tracks.map((track) => {
          if (track.id === id) {
            const newTrack = { ...track, ...partial };
            return newTrack;
          }
          return track;
        });
        return { tracks: updatedTracks };
      });
    },
    editAllTracksByType: <T extends Track>(trackType: string, partial: Partial<T>): void => {
      set((state) => {
        const updatedTracks = state.tracks.map((track) => {
          if (track.type === trackType) {
            const newTrack = { ...track, ...partial };
            return newTrack;
          }
          return track;
        });
        return { tracks: updatedTracks };
      });
    },
    getIndexByType: (id: string) => {
      const state = get();
      const thisTrack = state.getTrack(id);
      if (!thisTrack) return -1;
      const index = state.tracks.filter((track) => track.type === thisTrack.type).findIndex((track) => track.id === id);
      return index;
    },
  }));
}
