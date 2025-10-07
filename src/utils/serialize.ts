import { compress, decompress } from "lz-string";
import { BrowserStoreInstance, InitialBrowserState } from "../store/browserStore";
import { Track, TrackStoreInstance } from "../store/trackStore";

export function getLocalBrowserState(prefix?: string) {
  const localBrowserString = sessionStorage.getItem(`${prefix || ""}browserState`);
  let localBrowserState: InitialBrowserState | undefined;

  if (localBrowserString) {
    const browserState = deserialize<InitialBrowserState>(localBrowserString);
    localBrowserState = browserState;
  }
  return localBrowserState;
}

export function getLocalTrackState(prefix?: string) {
  const localTrackString = sessionStorage.getItem(`${prefix || ""}trackState`);
  let localTrackState: Track[] | undefined;

  if (localTrackString) {
    const trackStore = deserialize<Track[]>(localTrackString);
    localTrackState = trackStore;
  }
  return localTrackState;
}

export function setLocalBrowserState(browserStore: BrowserStoreInstance, prefix?: string) {
  const browserString = serializeBrowserState(browserStore);
  sessionStorage.setItem(`${prefix || ""}browserState`, browserString);
}

export function setLocalTrackState(trackStore: TrackStoreInstance, prefix?: string) {
  const trackString = serializeTrackState(trackStore);
  sessionStorage.setItem(`${prefix || ""}trackState`, trackString);
}

function serializeBrowserState(browserStore: BrowserStoreInstance) {
  const browserState = {
    domain: browserStore.getState().domain,
    marginWidth: browserStore.getState().marginWidth,
    trackWidth: browserStore.getState().trackWidth,
    multiplier: browserStore.getState().multiplier,
    highlights: browserStore.getState().highlights,
  };

  const browserString = compress(JSON.stringify(browserState));
  return browserString;
}

function serializeTrackState(trackStore: TrackStoreInstance) {
  const trackList = trackStore.getState().tracks;
  const trackString = compress(JSON.stringify(trackList));
  return trackString;
}

function deserialize<T>(stateString: string) {
  const state = JSON.parse(decompress(stateString)) as T;
  return state;
}
