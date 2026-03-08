import { FetcherContext } from "../../api/fetchers";
import { TrackDataState } from "../../store/dataStore";

/**
 * Shared behavior for a track kind — one per track type (e.g. BigWig, BigBed).
 * Holds renderers, fetcher, and optional settings panel.
 * Display modes are derived from the keys of `renderers`.
 */
export interface TrackDefinition<TDisplayMode extends string = string> {
  type: string;
  defaultDisplayMode: TDisplayMode;
  defaultHeight: number;
  renderers: Record<TDisplayMode, React.ComponentType<any>>;
  fetcher: (ctx: FetcherContext) => Promise<TrackDataState>;
  settingsPanel?: React.ComponentType<{ id: string }>;
}

/**
 * Base track instance — shared fields for all tracks.
 * Per-type fields are added via intersection types (e.g. BigWigTrack = Track & { url: string }).
 */
export interface Track {
  id: string;
  title: string;
  height: number;
  displayMode: string;
  definition: TrackDefinition;
  // Display
  color?: string;
  titleSize?: number;
  // Interaction
  onClick?: (item: any) => void;
  onHover?: (item: any) => void;
  onLeave?: (item: any) => void;
  tooltip?: React.FC<any>;
}

export interface TrackDimensions {
  totalWidth: number; // total width of the track, including extra sides
  viewWidth: number; // the width of the viewable area
  sideWidth: number; // the width of the side portions (hidden until dragged into view)
}
