export enum TrackType {
  BigWig = "bigwig",
  BigBed = "bigbed",
  Transcript = "transcript",
  Motif = "motif",
  Importance = "importance",
  LDTrack = "ldtrack",
}

export enum DisplayMode {
  Full = "full",
  Dense = "dense",
  Squish = "squish",
  Pack = "pack",
}

export interface BaseConfig {
  id: string;
  height: number;
  trackType: TrackType;
  displayMode: DisplayMode;
  title: string;
  titleSize?: number;
  shortLabel?: string;
  color?: string;
}

export interface TrackDimensions {
  multiplier: number; // multiplier for the amount of data to fetch
  totalWidth: number; // total width of the track, including extra sides
  viewWidth: number; // the width of the viewable area
  sideWidth: number; // the width of the side portions (hidden until dragged into view)
  sidePortion: number; // the percentage of total width the side portions take up
}
