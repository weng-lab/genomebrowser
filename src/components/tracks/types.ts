export enum TrackType {
  BigWig = "bigwig",
  BigBed = "bigbed",
  Transcript = "transcript",
  Motif = "motif",
  Importance = "importance",
  LDTrack = "ldtrack",
  BulkBed = "bulkbed",
  MethylC = "methylc",
}

export enum DisplayMode {
  Full = "full",
  Dense = "dense",
  Squish = "squish",
  Pack = "pack",
  Combined = "combined",
  Split = "split",
  Scatter = "scatter",
}

// Interaction configuration for all tracks
export interface InteractionConfig<Item> {
  onClick?: (item: Item) => void;
  onHover?: (item: Item) => void;
  onLeave?: (item: Item) => void;
  tooltip?: React.FC<Item>;
}

// Display configuration for all tracks
export interface DisplayConfig {
  titleSize?: number;
  shortLabel?: string;
  color?: string;
}

// All new configs should extend this interface
export interface Config<Item> extends InteractionConfig<Item>, DisplayConfig {
  id: string;
  trackType: TrackType;
  displayMode: DisplayMode;
  title: string;
  height: number;
}

export interface TrackDimensions {
  totalWidth: number; // total width of the track, including extra sides
  viewWidth: number; // the width of the viewable area
  sideWidth: number; // the width of the side portions (hidden until dragged into view)
}
