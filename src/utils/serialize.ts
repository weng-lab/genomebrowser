import { compress, decompress } from "lz-string";
import { BrowserStoreInstance, InitialBrowserState } from "../store/browserStore";
import { Track, TrackStoreInstance } from "../store/trackStore";

export function getLocalState() {
  const localBrowserString = sessionStorage.getItem("browserState");
  const localTrackString = sessionStorage.getItem("trackState");
  let localBrowserState: InitialBrowserState | undefined;
  let localTrackState: Track[] | undefined;

  if (localBrowserString && localTrackString) {
    const { browserStore, trackStore } = deserialize(localBrowserString, localTrackString);
    localBrowserState = browserStore;
    localTrackState = trackStore;
  }
  return { localBrowserState, localTrackState };
}

export function setLocalState(browserStore: BrowserStoreInstance, trackStore: TrackStoreInstance) {
  const { browserString, trackString } = serialize(browserStore, trackStore);
  sessionStorage.setItem("browserState", browserString);
  sessionStorage.setItem("trackState", trackString);
}

function serialize(browserStore: BrowserStoreInstance, trackStore: TrackStoreInstance) {
  const browserState = {
    domain: browserStore.getState().domain,
    marginWidth: browserStore.getState().marginWidth,
    trackWidth: browserStore.getState().trackWidth,
    multiplier: browserStore.getState().multiplier,
    highlights: browserStore.getState().highlights,
  };

  const trackList = trackStore.getState().tracks;

  const browserString = compress(JSON.stringify(browserState));
  const trackString = compress(JSON.stringify(trackList));

  return { browserString, trackString };
}

function deserialize(browserString: string, trackString: string) {
  const browserStore = JSON.parse(decompress(browserString)) as InitialBrowserState;
  const trackStore = JSON.parse(decompress(trackString)) as Track[];

  return { browserStore, trackStore };
}
