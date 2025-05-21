import { BaseConfig, TrackDimensions, TrackType } from "../types";

export interface BigWigConfig extends BaseConfig {
  trackType: TrackType.BigWig;
  url: string;
  range?: YRange;
  tooltip?: React.FC<BigWigData>;
}

export type FullBigWigProps = {
  data: Data;
  range: YRange;
  id: string;
  height: number;
  color: string;
  dimensions: TrackDimensions;
  tooltip?: React.FC<BigWigData>;
};

export interface DenseBigWigProps {
  id: string;
  data: Data;
  color: string;
  height: number;
  dimensions: TrackDimensions;
  tooltip?: React.FC<BigWigData>;
}

export type YRange = {
  min: number;
  max: number;
};

export type ValuedPoint = {
  x: number;
  min: number;
  max: number;
};

export interface BigWigData {
  chr: string;
  start: number;
  end: number;
  value: number;
}

export interface BigZoomData {
  chr: string;
  start: number;
  end: number;
  validCount: number;
  minVal: number;
  maxVal: number;
  sumData: number;
  sumSquares: number;
}

export type Data = ValuedPoint[] | BigWigData[] | BigZoomData[];

export enum DataType {
  ValuedPoint = "valuedPoint",
  BigZoomData = "bigZoomData",
  BigWigData = "bigWigData",
}

export type RenderedBigWigData = {
  renderPoints: ValuedPoint[];
  range: YRange;
};

/**
 * Checks the type of data passed to the FullBigWig component
 * @param data the data used in the track
 * @returns an enumerated value representing the data type
 */
export function dataType(data: any): DataType {
  if (data[0].x !== undefined) {
    return DataType.ValuedPoint;
  }
  if (data[0].minVal !== undefined) {
    return DataType.BigZoomData;
  }
  return DataType.BigWigData;
}

export type Paths = {
  path: string;
  clampedMarkers: string;
};
