import BaseBrowser from "./BaseBrowser";
import { builtInTrackDefinitions } from "../tracks/builtins";
import { TrackDefinition } from "../tracks/types";
import { BrowserStoreInstance } from "../../store/browserStore";
import { TrackStoreInstance } from "../../store/trackStore";
import { DataStoreInstance } from "../../store/dataStore";

interface BrowserProps {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  externalDataStore?: DataStoreInstance;
  customTracks?: TrackDefinition[];
}

export default function Browser({ customTracks = [], ...props }: BrowserProps) {
  return <BaseBrowser {...props} trackDefinitions={[...builtInTrackDefinitions, ...customTracks]} />;
}
