import { Shared } from "../../../store/tracksStore";

export interface BigWigProps extends Shared {
  range: YRange;
}

// export interface FullBigWigProps extends BaseBigWigProps {
//   range: YRange;
// }

// export interface DenseBigWigProps extends BaseBigWigProps {}

// export type BigWigProps = FullBigWigProps | DenseBigWigProps;

export type RenderedBigWigData = {
  renderPoints: ValuedPoint[];
  range: YRange;
};

export type ValuedPoint = {
  x: number;
  min: number;
  max: number;
};

export type YRange = {
  min: number;
  max: number;
};

export interface BigWigData {
  chr: string;
  start: number;
  end: number;
  value: number;
}

export type Data = ValuedPoint[] | BigWigData[] | BigZoomData[];

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

export enum DataType {
  ValuedPoint = "valuedPoint",
  BigZoomData = "bigZoomData",
  BigWigData = "bigWigData",
}

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

/**
 * Creates a shallow copy of the data passed to the FullBigWig component
 * @param data The bigwig track data
 * @returns a shallow copy of the data
 */
export function createCopy(data: Data | undefined): Data {
  if (dataType(data) === DataType.BigWigData) {
    return (data as BigWigData[]).map((a) => ({ ...a })) as BigWigData[];
  } else if (dataType(data) === DataType.BigZoomData) {
    return (data as BigZoomData[]).map((a) => ({ ...a })) as BigZoomData[];
  } else if (dataType(data) === DataType.ValuedPoint) {
    return (data as ValuedPoint[]).map((a) => ({ ...a })) as ValuedPoint[];
  }
  return [];
}
// Helper function for getRange
const calculateRange = <T>(data: T[], getValue: (d: T) => number): YRange => {
  return {
    min: data.reduce((min, d) => (getValue(d) < min ? getValue(d) : min), Infinity),
    max: data.reduce((max, d) => (getValue(d) > max ? getValue(d) : max), -Infinity),
  };
};
export const getRange = (data: Data): YRange => {
  switch (dataType(data)) {
    case DataType.BigWigData:
      return calculateRange(data as BigWigData[], (d: BigWigData) => d.value);
    case DataType.BigZoomData:
      return calculateRange(data as BigZoomData[], (d: BigZoomData) => d.maxVal);
    case DataType.ValuedPoint:
      return calculateRange(data as ValuedPoint[], (d: ValuedPoint) => d.max);
    default:
      return { min: 0, max: 0 } as YRange;
  }
};

export function l(x: number, y: number): string {
  return ` L ${x} ${y}`;
}

export type Paths = {
  maxPath: string;
  minPath: string;
};

type Domain = {
  start: number;
  end: number;
};

export function xtransform(domain: Domain, width: number): (i: number) => number {
  return (i: number) => ((i - domain.start) * width) / (domain.end - domain.start);
}

export function ytransform(range: YRange, height: number): (i: number) => number {
  return (i: number) => (range.max === range.min ? 0 : ((range.max - i) * height) / (range.max - range.min));
}

export function trackXTransform(domain: Domain, data: Domain[], width: number) {
  return domain
    ? xtransform(domain, width)
    : xtransform(
        data.reduce(
          (domain, v) => ({
            start: v.start < domain.start ? v.start : domain.start,
            end: v.end > domain.end ? v.end : domain.end,
          }),
          { start: Infinity, end: -Infinity }
        ),
        width
      );
}

export function isBigWigData(value: BigWigData | BigZoomData): value is BigWigData {
  return (value as BigWigData).value !== undefined;
}

export function renderBigWig(data: BigWigData[] | BigZoomData[] | undefined | null, width: number): RenderedBigWigData {
  if (!data) return { renderPoints: [], range: { max: 1, min: 0 } };

  // get domain and create x transform mapping
  const domain = (data as Domain[]).reduce<Domain>(
    (domain: Domain, v: Domain): Domain => ({
      start: v.start < domain.start ? v.start : domain.start,
      end: v.end > domain.end ? v.end : domain.end,
    }),
    { start: Infinity, end: -Infinity }
  );
  const x = trackXTransform(domain, data, width);

  // create array of placeholder values for each x coordinate
  const initialValues: ValuedPoint[] = [];
  const cbounds = { start: Math.floor(x(data[0].start)), end: Math.floor(x(data[data.length - 1].end)) };
  for (let i = cbounds.start; i < cbounds.end; ++i)
    initialValues.push({
      x: i,
      max: -Infinity,
      min: Infinity,
    });

  // iterate over passed values, computing ranges for individual points and getting the overall range
  const result: RenderedBigWigData = { renderPoints: initialValues, range: { max: -Infinity, min: Infinity } };
  data.forEach((point: BigWigData | BigZoomData) => {
    const cxs = Math.floor(x(point.start)),
      cxe = Math.floor(x(point.end));
    const pmin = isBigWigData(point) ? point.value : point.minVal;
    const pmax = isBigWigData(point) ? point.value : point.maxVal;
    if (pmin < result.renderPoints[cxs].min) result.renderPoints[cxs].min = pmin;
    if (pmax > result.renderPoints[cxs].max) result.renderPoints[cxs].max = pmax;
    for (let i = cxs + 1; i < cxe; ++i) {
      result.renderPoints[i].min = pmin;
      result.renderPoints[i].max = pmax;
    }
    if (pmin < result.range.min) result.range.min = pmin;
    if (pmax > result.range.max) result.range.max = pmax;
  });
  return result;
}

export const clampData = (data: Data, range: YRange): Data => {
  switch (dataType(data)) {
      case DataType.BigWigData:
          (data as BigWigData[]).forEach((element: BigWigData) => {
              if (element.value < range.min) {
                  element.value = range.min;
              }
              if (element.value > range.max) {
                  element.value = range.max;
              }
          });
          return data
      case DataType.BigZoomData:
          (data as BigZoomData[]).forEach((element: BigZoomData) => {
              if (element.minVal < range.min) {
                  element.minVal = range.min;
              }
              if (element.maxVal > range.max) {
                  element.maxVal = range.max;
              }
          })
          return data
      case DataType.ValuedPoint:
          (data as ValuedPoint[]).forEach((element: ValuedPoint) => {
              if (element.min < range.min) {
                  element.min = range.min;
              }
              if (element.max > range.max) {
                  element.max = range.max;
              }
          })
          return data
      default:
          return []
  }
}

export const svgPoint = (svg: SVGSVGElement, event: React.MouseEvent<SVGElement>) => {
  if (svg.createSVGPoint && svg) {
      let point = svg.createSVGPoint()
      point.x = event.clientX
      point.y = event.clientY
      point = point.matrixTransform(svg!.getScreenCTM()!.inverse())
      return [point.x, point.y]
  }
  const rect = svg.getBoundingClientRect()
  return [event.clientX - rect.left - svg.clientLeft, event.clientY - rect.top - svg.clientTop]
}