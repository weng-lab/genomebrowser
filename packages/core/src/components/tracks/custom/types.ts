import { FetcherContext } from "../../../api/fetchers";
import { TrackDataState } from "../../../store/dataStore";
import { Config, DisplayMode, TrackDimensions, TrackType } from "../types";

export interface CustomTrackConfig<Data = any> extends Config<Data> {
  trackType: TrackType.Custom;
  renderers: Partial<Record<DisplayMode, React.ComponentType<CustomTrackProps<Data>>>>;
  fetcher: (ctx: FetcherContext) => Promise<TrackDataState>;
}

export interface CustomTrackProps<Data = any> extends Config<Data> {
  data: Data;
  dimensions: TrackDimensions;
}
