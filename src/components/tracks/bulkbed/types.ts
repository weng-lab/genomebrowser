import { TrackType, TrackDimensions, Config } from "../types";

export interface BulkBedDataset {
  name: string;
  url: string;
}

export interface BulkBedConfig extends Config<BulkBedRect> {
  trackType: TrackType.BulkBed;
  datasets: BulkBedDataset[];
  urls?: string[]; // Legacy support - will be converted to datasets internally
  gap?: number; // Gap between instances
}

export interface BulkBedProps {
  id: string;
  data: BulkBedRect[][];
  datasets: BulkBedDataset[];
  color: string;
  height: number;
  dimensions: TrackDimensions;
  gap?: number;
  onClick?: (rect: BulkBedRect) => void;
  onHover?: (rect: BulkBedRect) => void;
  onLeave?: (rect: BulkBedRect) => void;
  tooltip?: React.FC<BulkBedRect>;
}

export interface Rect {
  start: number;
  end: number;
  color?: string;
  name?: string;
  score?: number;
}

export interface BulkBedRect extends Rect {
  datasetName?: string; // Name of the dataset this rect belongs to
}
