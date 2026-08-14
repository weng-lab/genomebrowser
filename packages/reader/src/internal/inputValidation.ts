import type { GenomicRegion } from "../genomicFile";

export function validateHttpUrl(url: string): string {
  if (typeof url !== "string") {
    throw new TypeError("URL must be a string");
  }

  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new TypeError("URL must use HTTP or HTTPS");
  }

  return parsedUrl.href;
}

export function validateRegion(region: GenomicRegion): void {
  if (region === null || typeof region !== "object") {
    throw new TypeError("Region must be an object");
  }

  const coordinates = [region.start, region.end];
  if (
    coordinates.some(
      (coordinate) =>
        typeof coordinate !== "number" ||
        !Number.isFinite(coordinate) ||
        !Number.isInteger(coordinate),
    )
  ) {
    throw new TypeError("Region coordinates must be finite integers");
  }

  if (region.start < 0 || region.end < 0 || region.start >= region.end) {
    throw new RangeError("Region must have non-negative coordinates with start before end");
  }
}
