import { create } from "zustand";
import { BigWigConfig } from "../components/tracks/bigwig/types";
import { BigBedConfig } from "../components/tracks/bigbed/types";
import { TranscriptConfig } from "../components/tracks/transcript/types";
import { MotifConfig } from "../components/tracks/motif/types";
import { ImportanceConfig } from "../components/tracks/importance/types";
import { LDTrackConfig } from "../components/tracks/ldtrack/types";
import { RULER_HEIGHT } from "../components/tracks/ruler/ruler";

type WrapperDimensions = {
  trackMargin: number;
  titleSize: number;
  totalVerticalMargin: number;
  wrapperHeight: number;
};

export type Track = BigWigConfig | BigBedConfig | TranscriptConfig | MotifConfig | ImportanceConfig | LDTrackConfig;

interface TrackStore {
  tracks: Track[];
  ids: string[];
  setTracks: (tracks: Track[]) => void;
  getTotalHeight: () => number;
  getPrevHeights: (id: string) => number;
  getDistances: (id: string) => number[];
  getTrack: (id: string) => Track | undefined;
  getTrackIndex: (id: string) => number;
  shiftTracks: (id: string, index: number) => void;
  insertTrack: (track: Track, index?: number) => void;
  removeTrack: (id: string) => void;
  getDimensions: (id: string) => WrapperDimensions;
  createShortLabel: (id: string) => string;
  getIndexByType: (id: string) => number;
  editTrack: <T extends Track>(id: string, partial: Partial<T>) => void;
}

export const useTrackStore = create<TrackStore>((set, get) => ({
  tracks: [] as Track[],
  ids: [] as string[],
  setTracks: (tracks: Track[]) => set({ tracks, ids: tracks.map((track) => track.id) }),
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
  getTotalHeight: () => {
    const state = get();
    return state.tracks.reduce((acc, curr) => {
      const { wrapperHeight } = get().getDimensions(curr.id);
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
  getPrevHeights: (id: string) => {
    const state = get();
    const index = state.getTrackIndex(id);
    return state.tracks.slice(0, index).reduce((acc, curr) => {
      const { wrapperHeight } = get().getDimensions(curr.id);
      return acc + wrapperHeight;
    }, 0);
  },
  getDistances: (id: string) => {
    const state = get();
    const heights = state.tracks.map((track) => {
      const { wrapperHeight } = get().getDimensions(track.id);
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
    tracks.splice(index, 0, track); // Insert track at new index
    set({ tracks, ids: tracks.map((track) => track.id) });
  },
  getTrackbyIndex: (index: number) => {
    const state = get();
    return state.tracks[index];
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
  getDimensions: (id: string) => {
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
      throw new Error("Track not found");
    }
    const trackMargin = track.height / 6;
    const titleSize = track.titleSize || trackMargin * 2.5;
    const titleMargin = track.title ? titleSize + 5 : 0;
    const totalVerticalMargin = trackMargin + titleMargin;
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
