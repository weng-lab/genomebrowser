import { Config, TrackDimensions, TrackType } from "../types";

export interface BigWigConfig extends Config<Data> {
  trackType: TrackType.BigWig;
  url: string;
  range?: YRange;
  customRange?: YRange;
  /** When true, fill gaps in data with 0 instead of null. Defaults to false. */
  fillWithZero?: boolean;
}

interface BigWigProps {
  id: string;
  height: number;
  color: string;
  data: Data;
  dimensions: TrackDimensions;
  tooltip?: React.FC<Data>;
}

export interface FullBigWigProps extends BigWigProps {
  range: YRange;
  customRange?: YRange;
  fillWithZero?: boolean;
}
export type DenseBigWigProps = BigWigProps;

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

export type Data = ValuedPoint[]; // | BigWigData[] | BigZoomData[];

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
