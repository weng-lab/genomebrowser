import { Data, DataType, BigWigData, BigZoomData, ValuedPoint, YRange, RenderedBigWigData, dataType } from "./types";

type Domain = {
  start: number;
  end: number;
};

const calculateRange = <T>(data: T[], getValue: (d: T) => number): YRange => ({
  min: Math.min(...data.map(getValue)),
  max: Math.max(...data.map(getValue)),
});

export const getRange = (data: Data): YRange => {
  if (!data.length) return { min: 0, max: 0 };

  switch (dataType(data)) {
    case DataType.BigWigData:
      return calculateRange(data as BigWigData[], (d) => d.value);
    case DataType.BigZoomData:
      return calculateRange(data as BigZoomData[], (d) => d.maxVal);
    case DataType.ValuedPoint:
      return calculateRange(data as ValuedPoint[], (d) => d.max);
    default:
      return { min: 0, max: 0 };
  }
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

export const renderDense = (data: ValuedPoint[]) => {
  const domain = { start: data[0].x, end: data[data.length - 1].x };
  const x = trackXTransform(
    domain,
    data.map((d) => {
      return { start: d.x, end: d.x + 1 };
    }),
    100.0
  );

  const initialValues: ValuedPoint[] = [];
  for (let i = 0; i <= 100; ++i) {
    initialValues.push({
      x: i,
      max: -Infinity,
      min: Infinity,
    });
  }
  return data.reduce(
    (c, point) => {
      const cxs = Math.floor(x(point.x)),
        cxe = Math.floor(x(point.x));
      if (point.min < c.renderPoints[cxs].min) c.renderPoints[cxs].min = point.min;
      if (point.max > c.renderPoints[cxs].max) c.renderPoints[cxs].max = point.max;
      for (let i = cxs + 1; i <= cxe; ++i) {
        c.renderPoints[i].min = point.min;
        c.renderPoints[i].max = point.max;
      }
      if (point.min < c.range.min) c.range.min = point.min;
      if (point.max > c.range.max) c.range.max = point.max;
      return c;
    },
    { renderPoints: initialValues, range: { max: -Infinity, min: Infinity } }
  );
};

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

export function l(x: number, y: number): string {
  return ` L ${x} ${y}`;
}
