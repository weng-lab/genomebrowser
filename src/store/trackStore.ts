import { create } from "zustand";
import { BigWigProps } from "../components/tracks/bigwig/types";
// All avaliable track types
export enum TrackType {
  BigWig = "bigwig",
  BigBed = "bigbed",
  Transcript = "transcript",
}

export enum DisplayMode {
  Full = "full",
}

// Shared properties for all tracks
export interface Shared {
  id: string;
  height: number;
  trackType: TrackType;
  color?: string;
  displayMode: DisplayMode;
}

// Display properties for all tracks
export interface Display {
  title: string;
  titleSize?: number;
  shortLabel?: string;
}

// Base properties for all tracks
export type Base = Shared & Display;

// Track type includes all specific track types + base properties
export type Track = Base & BigWigProps;

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
  insertTrack: (track: Track, index: number) => void;
  removeTrack: (id: string) => void;
  updateTrack: <K extends keyof Track>(id: string, key: K, value: Track[K]) => void;
  getDimensions: (id: string) => any;
  createShortLabel: (id: string) => string;
  getField: (id: string, field: string) => any;
  getIndexByType: (id: string) => number;
}

export const useTrackStore = create<TrackStore>((set, get) => ({
  tracks: [] as Track[],
  ids: [] as string[],
  setTracks: (tracks: Track[]) => set({ tracks, ids: tracks.map((track) => track.id) }),
  getTrackIds: () => get().ids,
  getField: (id: string, field: string) => {
    const track = get().getTrack(id);
    if (!track) {
      throw new Error("Track not found");
    }
    const result = track[field as keyof Track];
    if (!result) {
      return null;
    }
    return result;
  },
  createShortLabel: (id: string) => {
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
  insertTrack: (track: Track, index: number) => {
    const state = get();
    const tracks = [...state.tracks];
    tracks.splice(index, 0, track);
    set({ tracks, ids: tracks.map((track) => track.id) });
  },
  removeTrack: (id: string) => {
    const state = get();
    const tracks = [...state.tracks];
    tracks.splice(state.getTrackIndex(id), 1);
    set({ tracks, ids: tracks.map((track) => track.id) });
  },
  updateTrack: <K extends keyof Track>(id: string, key: K, value: Track[K]) => {
    set((state) => ({
      tracks: state.tracks.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  },
  getDimensions: (id: string) => {
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
