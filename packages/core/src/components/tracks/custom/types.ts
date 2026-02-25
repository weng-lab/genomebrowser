import { FetcherContext } from "../../../api/fetchers";
import { TrackDataState } from "../../../store/dataStore";
import { Config, DisplayMode, TrackDimensions, TrackType } from "../types";

export interface CustomTrackConfig<Item = any> extends Config<Item> {
  trackType: TrackType.Custom;
  renderers: Partial<Record<DisplayMode, React.ComponentType<any>>>;
  fetcher: (ctx: FetcherContext) => Promise<TrackDataState>;
}

export interface CustomTrackProps<Data = any, Item = any> extends Config<Item> {
  data: Data;
  dimensions: TrackDimensions;
}
