import { TrackDimensions, TrackInstance } from "../types";

export interface BulkBedDataset {
  name: string;
  url: string;
}

export interface BulkBedConfig extends TrackInstance<BulkBedRect> {
  datasets: BulkBedDataset[];
  gap?: number; // Gap between instances
}

export interface BulkBedRendererProps {
  id: string;
  data: BulkBedRect[][];
  datasets: BulkBedDataset[];
  color?: string;
  height: number;
  dimensions: TrackDimensions;
  gap?: number;
  onClick?: (rect: BulkBedRect) => void;
  onHover?: (rect: BulkBedRect) => void;
  onLeave?: (rect: BulkBedRect) => void;
  tooltip?: React.FC<BulkBedRect>;
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
