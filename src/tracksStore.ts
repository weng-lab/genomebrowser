import { create } from "zustand";

export interface Track {
  id: number;
  data: string;
  height: number;
  color: string;
  alt: string;
}

interface TrackStore {
  tracks: Track[];
  updateColor: (index: number, color: string) => void;
  updateHeight: (index: number, height: number) => void;
  updateText: (index: number, text: string) => void;
  getTotalHeight: () => number;
  getTrack: (index: number) => Track;
  getPrevHeights: (index: number) => number;
  getTrackLength: () => number;
  setTrackData: (data: string[]) => void;
}

export const useTrackStore = create<TrackStore>((set, get) => ({
  tracks: [
    { id: 1, data: "", height: 90, color: "#ffadad", alt: "#ff9494" },
    { id: 2, data: "", height: 50, color: "#ffd6a5", alt: "#ffc78c" },
    { id: 3, data: "", height: 75, color: "#fdffb6", alt: "#f4f68d" },
    { id: 4, data: "", height: 80, color: "#caffbf", alt: "#b1ffa6" },
    { id: 5, data: "", height: 60, color: "#9bf6ff", alt: "#82dde6" },
    { id: 6, data: "", height: 40, color: "#a0c4ff", alt: "#87abf6" },
    { id: 7, data: "", height: 35, color: "#bdb2ff", alt: "#a499f6" },
  ] as Track[],
  updateColor: (id: number, color: string) =>
    set((state) => ({
      tracks: state.tracks.map((item, i) => (i === id ? { ...item, color } : item)),
    })),
  updateHeight: (id: number, height: number) =>
    set((state) => ({
      tracks: state.tracks.map((item, i) => (i === id ? { ...item, height } : item)),
    })),
  updateText: (id: number, text: string) =>
    set((state) => ({
      tracks: state.tracks.map((item, i) => (i === id ? { ...item, text } : item)),
    })),
  getTotalHeight: () => {
    const state = get();
    return state.tracks.reduce((acc, curr) => acc + curr.height, 0);
  },
  getTrack: (id: number) => {
    const state = get();
    return state.tracks[id];
  },
  getPrevHeights: (id: number) => {
    const state = get();
    return state.tracks.slice(0, id).reduce((acc, curr) => acc + curr.height, 0);
  },
  getTrackLength: () => {
    const state = get();
    return state.tracks.length;
  },
  setTrackData: (data: string[]) =>
    set((state) => ({
      tracks: state.tracks.map((track, i) => ({
        ...track,
        data: data[i] || track.data,
      })),
    })),
}));
