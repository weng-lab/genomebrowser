import { gunzipSync } from "fflate";

import { throwIfAborted } from "./internal/abort";
import { validateHttpUrl } from "./internal/inputValidation";

/** One UCSC cytoband record with zero-based, half-open coordinates. */
export type Cytoband = {
  readonly chromosome: string;
  readonly start: number;
  readonly end: number;
  readonly name: string;
  readonly stain: string;
};

export type ReadCytobandsOptions = {
  url: string;
  signal?: AbortSignal;
};

/** Parses UCSC cytoband text into immutable records in source order. */
export function parseCytobands(text: string): readonly Cytoband[] {
  if (typeof text !== "string") {
    throw new TypeError("Cytobands must be provided as text");
  }

  const cytobands: Cytoband[] = [];

  for (const [index, sourceLine] of text.split(/\r\n?|\n/).entries()) {
    if (sourceLine.trim().length === 0) continue;

    const fields = sourceLine.split("\t");
    if (fields.length !== 5) {
      throw new Error(
        `Invalid cytoband line ${index + 1}: expected exactly five tab-separated fields`,
      );
    }

    const [chromosome, startText, endText, name, stain] = fields;
    if (
      chromosome.length === 0 ||
      startText.length === 0 ||
      endText.length === 0 ||
      stain.length === 0
    ) {
      throw new Error(
        `Invalid cytoband line ${index + 1}: chromosome, coordinates, and stain must not be empty`,
      );
    }
    if (!/^\d+$/.test(startText) || !/^\d+$/.test(endText)) {
      throw new Error(
        `Invalid cytoband line ${index + 1}: coordinates must be non-negative integers`,
      );
    }

    const start = Number(startText);
    const end = Number(endText);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
      throw new Error(`Invalid cytoband line ${index + 1}: coordinates must be safe integers`);
    }
    if (start >= end) {
      throw new Error(`Invalid cytoband line ${index + 1}: start must be less than end`);
    }

    cytobands.push(Object.freeze({ chromosome, start, end, name, stain }));
  }

  return Object.freeze(cytobands);
}

/** Fetches and parses a plain UTF-8 or gzip-compressed UCSC cytoband file. */
export async function readCytobands(options: ReadCytobandsOptions): Promise<readonly Cytoband[]> {
  if (typeof options !== "object" || options === null) {
    throw new TypeError("Cytoband options must be an object");
  }

  const url = validateHttpUrl(options.url);
  throwIfAborted(options.signal);
  const response = await fetch(url, { signal: options.signal });
  throwIfAborted(options.signal);

  if (!response.ok) {
    throw new Error(`Failed to read cytoband file: received HTTP ${response.status}`);
  }

  const responseBytes = new Uint8Array(await response.arrayBuffer());
  throwIfAborted(options.signal);
  const textBytes = isGzip(responseBytes) ? gunzipSync(responseBytes) : responseBytes;
  throwIfAborted(options.signal);
  return parseCytobands(new TextDecoder().decode(textBytes));
}

function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}
