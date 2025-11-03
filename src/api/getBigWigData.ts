import axios from "axios";
import { AxiosDataLoader, BigWigData, BigWigReader, BigZoomData, FileType } from "bigwig-reader";
import { FetcherContext } from "./fetchers";
import { BigWigConfig } from "../components/tracks/bigwig/types";
import { TrackDataState } from "../store/dataStore";
import { Domain } from "../utils/types";

export async function getBigData(
  url: string,
  expandedDomain: Domain,
  preRenderedWidth?: number
): Promise<TrackDataState> {
  try {
    const axiosInstance = axios.create();
    const dataLoader = new AxiosDataLoader(url, axiosInstance);
    const reader = new BigWigReader(dataLoader);

    const header = await reader.getHeader();

    switch (header.fileType) {
      case FileType.BigWig:
        const data = await reader.readBigWigData(
          expandedDomain.chromosome,
          expandedDomain.start,
          expandedDomain.chromosome,
          expandedDomain.end
        );
        if (preRenderedWidth) {
          const condensedDataResult = await condensedData(
            data,
            preRenderedWidth,
            expandedDomain.start,
            expandedDomain.end
          );
          return { data: condensedDataResult, error: null };
        } else {
          return { data: data, error: null };
        }
      case FileType.TwoBit:
        const twoBitData = await reader.readTwoBitData(
          expandedDomain.chromosome,
          expandedDomain.start,
          expandedDomain.end
        );
        return { data: twoBitData, error: null };
      case FileType.BigBed:
        console.log("fetching bigbed");
        const bigBedData = await reader.readBigBedData(
          expandedDomain.chromosome,
          expandedDomain.start,
          expandedDomain.chromosome,
          expandedDomain.end
        );
        console.log(bigBedData);
        return { data: bigBedData, error: null };
      default:
        return { data: null, error: "Unsupported file type" };
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function condensedData(data: BigWigData[], preRenderedWidth: number, start: number, end: number): Promise<any[]> {
  let x: (i: number) => number = (i) => ((i - start) * preRenderedWidth) / (end - start);

  let cbounds: { start: number; end: number } = { start: Math.floor(x(start)), end: Math.floor(x(end)) };
  let retval = initialPreRenderedValues(cbounds);

  data.forEach((point: BigWigData): void => {
    let cxs: number = Math.floor(x(point.start < start ? start : point.start));
    let cxe: number = Math.floor(x(point.end > end ? end : point.end));
    if (point.value < retval[cxs].min) {
      retval[cxs].min = point.value;
    }
    if (point.value > retval[cxs].max) {
      retval[cxs].max = point.value;
    }
    for (let i: number = cxs + 1; i <= cxe; ++i) {
      retval[i].min = point.value;
      retval[i].max = point.value;
    }
  });

  // Replace infinity values with null
  retval.forEach((point) => {
    if (point.min === Infinity) point.min = null;
    if (point.max === -Infinity) point.max = null;
  });

  return retval;
}

function initialPreRenderedValues(xdomain: { start: number; end: number }): any[] {
  let retval: any[] = [];
  for (let i: number = xdomain.start; i <= xdomain.end; ++i) {
    retval.push({
      x: i,
      max: -Infinity,
      min: Infinity,
    });
  }
  return retval;
}

export async function condensedZoomData(
  data: BigZoomData[],
  preRenderedWidth: number,
  start: number,
  end: number
): Promise<any[]> {
  let domain: { start: number; end: number } = { start, end };
  let x: (i: number) => number = (i) => ((i - domain.start) * preRenderedWidth) / (domain.end - domain.start);

  let cbounds: { start: number; end: number } = { start: Math.floor(x(domain.start)), end: Math.floor(x(domain.end)) };
  let retval = initialPreRenderedValues(cbounds);

  data.forEach((point: BigZoomData): void => {
    let cxs: number = Math.floor(x(point.start < domain.start ? domain.start : point.start));
    let cxe: number = Math.floor(x(point.end > domain.end ? domain.end : point.end));
    if (point.minVal < retval[cxs].min) {
      retval[cxs].min = point.minVal;
    }
    if (point.maxVal > retval[cxs].max) {
      retval[cxs].max = point.maxVal;
    }
    for (let i: number = cxs + 1; i <= cxe; ++i) {
      retval[i].min = point.minVal;
      retval[i].max = point.maxVal;
    }
  });
  return retval;
}

export async function ogBigWigFetcher(ctx: FetcherContext<BigWigConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth, queries } = ctx;

  const result = await queries.fetchBigData({
    variables: {
      bigRequests: [
        {
          url: track.url || "",
          chr1: expandedDomain.chromosome,
          start: expandedDomain.start,
          end: expandedDomain.end,
          zoomLevel: Math.floor((expandedDomain.end - expandedDomain.start) / preRenderedWidth),
          preRenderedWidth,
        },
      ],
    },
  });
  return {
    data: result.data?.bigRequests?.[0]?.data ?? null,
    error: result.error?.message ?? null,
  };
}
