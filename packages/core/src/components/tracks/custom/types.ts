import { FetcherContext } from "../../../api/fetchers";
import { TrackDataState } from "../../../store/dataStore";
import { TrackDimensions, TrackInstance } from "../types";

export interface CustomTrackConfig<Item = any> extends TrackInstance<Item> {
  renderers: Partial<Record<string, React.ComponentType<any>>>;
  fetcher: (ctx: FetcherContext) => Promise<TrackDataState>;
  settingsPanel?: React.ComponentType<{ id: string }>;
}

export interface CustomTrackProps<Data = any, Item = any> extends TrackInstance<Item> {
  data: Data;
  dimensions: TrackDimensions;
}
