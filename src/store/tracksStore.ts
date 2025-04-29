import { create } from "zustand";

export interface Track {
  id: string;
  data: string;
  height: number;
  color: string;
  alt: string;
}

interface TrackStore {
  tracks: Track[];
  setTracks: (tracks: Track[]) => void;
  updateColor: (id: string, color: string) => void;
  updateHeight: (id: string, height: number) => void;
  updateText: (id: string, text: string) => void;
  // internal functions
  getTotalHeight: () => number;
  getTrackLength: () => number;
  getPrevHeights: (id: string) => number;
  getDistances: (id: string) => number[];
  getTrack: (id: string) => Track | undefined;
  setTrackData: (data: string[]) => void;
  setLoading: () => void;
  getTrackIndex: (id: string) => number;
  getTrackbyIndex: (index: number) => Track | undefined;
  shiftTracks: (id: string, index: number) => void;
  insertTrack: (track: Track, index: number) => void;
  removeTrack: (id: string) => void;
  updateTrack: <K extends keyof Track>(id: string, key: K, value: Track[K]) => void;
}

export const useTrackStore = create<TrackStore>((set, get) => ({
  tracks: [] as Track[],
  setTracks: (tracks: Track[]) => set({ tracks }),
  updateColor: (id: string, color: string) =>
    set((state) => ({
      tracks: state.tracks.map((item, _) => (item.id === id ? { ...item, color } : item)),
    })),
  updateHeight: (id: string, height: number) =>
    set((state) => ({
      tracks: state.tracks.map((item) => (item.id === id ? { ...item, height } : item)),
    })),
  updateText: (id: string, text: string) =>
    set((state) => ({
      tracks: state.tracks.map((item) => (item.id === id ? { ...item, data: text } : item)),
    })),
  getTotalHeight: () => {
    const state = get();
    return state.tracks.reduce((acc, curr) => acc + curr.height, 0);
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
    return state.tracks.slice(0, index).reduce((acc, curr) => acc + curr.height, 0);
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
  setLoading: () => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        data: "LOADING",
      })),
    }));
  },
  getDistances: (id: string) => {
    const state = get();
    const heights = state.tracks.map((track) => track.height);
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
    set({ tracks });
  },
  getTrackbyIndex: (index: number) => {
    const state = get();
    return state.tracks[index];
  },
  insertTrack: (track: Track, index: number) => {
    const state = get();
    const tracks = [...state.tracks];
    tracks.splice(index, 0, track);
    set({ tracks });
  },
  removeTrack: (id: string) => {
    const state = get();
    const tracks = [...state.tracks];
    tracks.splice(state.getTrackIndex(id), 1);
    set({ tracks });
  },
  updateTrack: <K extends keyof Track>(id: string, key: K, value: Track[K]) =>
    set((state) => ({
      tracks: state.tracks.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    })),
}));
