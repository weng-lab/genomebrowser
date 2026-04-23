import { create } from "zustand";
import { BigWigConfig } from "../components/tracks/bigwig/types";
import { BigBedConfig } from "../components/tracks/bigbed/types";
import { BulkBedConfig } from "../components/tracks/bulkbed/types";
import { TranscriptConfig } from "../components/tracks/transcript/types";
import { MotifConfig } from "../components/tracks/motif/types";
import { ImportanceConfig } from "../components/tracks/importance/types";
import { LDTrackConfig } from "../components/tracks/ldtrack/types";
import { RULER_HEIGHT } from "../components/tracks/ruler/ruler";
import { MethylCConfig } from "../components/tracks/methylC/types";
import { TrackType } from "../components/tracks/types";
import { ManhattanTrackConfig } from "../components/tracks/manhattan/types";
import { CustomTrackConfig } from "../components/tracks/custom/types";
import { useMemo } from "react";

type WrapperDimensions = {
  trackMargin: number;
  titleSize: number;
  totalVerticalMargin: number;
  wrapperHeight: number;
};

export type Track =
  | BigWigConfig
  | BigBedConfig<any>
  | BulkBedConfig
  | TranscriptConfig
  | MotifConfig
  | ImportanceConfig
  | LDTrackConfig
  | MethylCConfig
  | ManhattanTrackConfig
  | CustomTrackConfig;

export interface TrackStore {
  tracks: Track[];
  ids: string[];
  setTracks: (tracks: Track[]) => void;
  reorderTracks: (idsInOrder: string[]) => void;
  getTotalHeight: (browserTitleSize: number) => number;
  getPrevHeights: (id: string, browserTitleSize: number) => number;
  getDistances: (id: string, browserTitleSize: number) => number[];
  getTrack: (id: string) => Track | undefined;
  getTrackIndex: (id: string) => number;
  shiftTracks: (id: string, index: number) => void;
  insertTrack: (track: Track, index?: number) => void;
  insertTracks: (tracks: Track[], index?: number) => void;
  removeTrack: (id: string) => void;
  removeTracks: (ids: string[]) => void;
  getDimensions: (id: string, browserTitleSize: number) => WrapperDimensions;
  createShortLabel: (id: string) => string;
  getIndexByType: (id: string) => number;
  editTrack: <T extends Track>(id: string, partial: Partial<T>) => void;
  editAllTracksByType: <T extends Track>(trackType: TrackType, partial: Partial<T>) => void;
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
    reorderTracks: (idsInOrder: string[]) => {
      const state = get();

      if (idsInOrder.length !== state.tracks.length) {
        throw new Error("Invalid track order");
      }

      const tracksById = new Map(state.tracks.map((track) => [track.id, track]));
      const seenIds = new Set<string>();
      const reorderedTracks = idsInOrder.map((id) => {
        if (seenIds.has(id)) {
          throw new Error("Invalid track order");
        }

        const track = tracksById.get(id);
        if (!track) {
          throw new Error("Invalid track order");
        }

        seenIds.add(id);
        return track;
      });

      if (seenIds.size !== state.tracks.length) {
        throw new Error("Invalid track order");
      }

      set({ tracks: reorderedTracks, ids: idsInOrder });
    },
    createShortLabel: (id: string) => {
      if (id === "ruler") {
        return "Ruler";
      }
      const track = get().getTrack(id);
      if (!track) {
        throw new Error("Track not found");
      }
      const { title, shortLabel } = track;
      if (shortLabel) return shortLabel;
      if (!title || !title.substring || !title.length) return "";
      return title.length <= 20 ? title : title.substring(0, 20) + "...";
    },
    getTotalHeight: (browserTitleSize: number) => {
      const state = get();
      return state.tracks.reduce((acc, curr) => {
        const { wrapperHeight } = get().getDimensions(curr.id, browserTitleSize);
        return acc + wrapperHeight;
      }, 0);
    },
    getTrackIndex: (id: string) => {
      const state = get();
      return state.tracks.map((track) => track.id).indexOf(id);
    },
    getTrack: (id: string) => {
      const state = get();
      return state.tracks.find((track) => track.id === id);
    },
    getPrevHeights: (id: string, browserTitleSize: number) => {
      const state = get();
      const index = state.getTrackIndex(id);
      return state.tracks.slice(0, index).reduce((acc, curr) => {
        const { wrapperHeight } = get().getDimensions(curr.id, browserTitleSize);
        return acc + wrapperHeight;
      }, 0);
    },
    getDistances: (id: string, browserTitleSize: number) => {
      const state = get();
      const heights = state.tracks.map((track) => {
        const { wrapperHeight } = get().getDimensions(track.id, browserTitleSize);
        return wrapperHeight;
      });
      const index = state.getTrackIndex(id);
      let distances = new Array(heights.length).fill(0);
      distances = heights.map((_, i) => {
        if (i < index) {
          return -heights.slice(i, index).reduce((sum, h) => sum + h, 0);
        } else if (i > index) {
          return heights.slice(index + 1, i + 1).reduce((sum, h) => sum + h, 0);
        }
        return 0;
      });
      return distances;
    },
    shiftTracks: (id: string, index: number) => {
      const state = get();
      const tracks = [...state.tracks];
      const track = tracks.find((track) => track.id === id);
      if (!track) {
        throw new Error("Track not found");
      }
      tracks.splice(state.getTrackIndex(id), 1); // Remove track from original position
      const realIndex = index === -1 ? tracks.length : index;
      tracks.splice(realIndex, 0, track); // Insert track at new index
      set({ tracks, ids: tracks.map((track) => track.id) });
    },
    getTrackbyIndex: (index: number) => {
      const state = get();
      return state.tracks[index];
    },
    insertTrack: (track: Track, index?: number) => {
      get().insertTracks([track], index);
    },
    insertTracks: (newTracks: Track[], index?: number) => {
      const state = get();
      const tracks = [...state.tracks];
      const existingIds = new Set(tracks.map((track) => track.id));
      const uniqueTracks = newTracks.filter((track) => {
        if (existingIds.has(track.id)) {
          return false;
        }
        existingIds.add(track.id);
        return true;
      });

      if (uniqueTracks.length === 0) {
        return;
      }

      tracks.splice(index ?? tracks.length, 0, ...uniqueTracks);
      set({ tracks, ids: tracks.map((track) => track.id) });
    },
    removeTrack: (id: string) => {
      get().removeTracks([id]);
    },
    removeTracks: (ids: string[]) => {
      const idsToRemove = new Set(ids);
      if (idsToRemove.size === 0) {
        return;
      }

      const state = get();
      const tracks = state.tracks.filter((track) => !idsToRemove.has(track.id));

      if (tracks.length === state.tracks.length) {
        return;
      }

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
    editAllTracksByType: <T extends Track>(trackType: TrackType, partial: Partial<T>): void => {
      set((state) => {
        const updatedTracks = state.tracks.map((track) => {
          if (track.trackType === trackType) {
            const newTrack = { ...track, ...partial };
            return newTrack;
          }
          return track;
        });
        return { tracks: updatedTracks };
      });
    },
    getDimensions: (id: string, browserTitleSize: number) => {
      if (id === "ruler") {
        return {
          trackMargin: 0,
          titleSize: 0,
          totalVerticalMargin: 0,
          wrapperHeight: RULER_HEIGHT,
        };
      }
      const state = get();
      const track = state.getTrack(id);
      if (!track) {
        throw new Error(`Track not found: ${id}`);
      }
      const titleSize = track.titleSize ?? browserTitleSize;
      const titleMargin = track.title ? titleSize + 5 : 0;
      const trackMargin = 0;
      const totalVerticalMargin = titleMargin;
      const wrapperHeight = track.height + totalVerticalMargin;
      return {
        trackMargin,
        titleSize,
        totalVerticalMargin,
        wrapperHeight,
      };
    },
    getIndexByType: (id: string) => {
      const state = get();
      const thisTrack = state.getTrack(id);
      if (!thisTrack) return -1;
      const index = state.tracks
        .filter((track) => track.trackType === thisTrack.trackType)
        .findIndex((track) => track.id === id);
      return index;
    },
  }));
}
