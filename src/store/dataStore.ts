import { create } from "zustand"

interface TrackDataStore {
  // Map of track ID to its data array
  trackData: Record<string, any[]>
  
  // Get data for a specific track
  getTrackData: (trackId: string) => any[]
  
  // Set data for a specific track
  setTrackData: (trackId: string, data: any[]) => void
  
  // Update data for a specific track
  updateTrackData: (trackId: string, data: any[]) => void
  
  // Remove data for a specific track
  removeTrackData: (trackId: string) => void
  
  // Clear all track data
  clearAllTrackData: () => void
}

const useTrackDataStore = create<TrackDataStore>((set, get) => ({
  trackData: {},
  
  getTrackData: (trackId: string) => {
    return get().trackData[trackId] || []
  },
  
  setTrackData: (trackId: string, data: any[]) => {
    set((state) => ({
      trackData: {
        ...state.trackData,
        [trackId]: data,
      },
    }))
  },
  
  updateTrackData: (trackId: string, data: any[]) => {
    set((state) => ({
      trackData: {
        ...state.trackData,
        [trackId]: [...(state.trackData[trackId] || []), ...data],
      },
    }))
  },
  
  removeTrackData: (trackId: string) => {
    set((state) => {
      const { [trackId]: removed, ...remaining } = state.trackData
      return { trackData: remaining }
    })
  },
  
  clearAllTrackData: () => {
    set({ trackData: {} })
  },
}))

export default useTrackDataStore