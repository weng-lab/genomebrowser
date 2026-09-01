import { throwIfAborted } from "./internal/abort";
import { validateHttpUrl } from "./internal/inputValidation";

export type ChromSizes = Readonly<Record<string, number>>;

export type ReadChromSizesOptions = {
  url: string;
  signal?: AbortSignal;
};

/** Parses a chrom.sizes file into an immutable map of sequence names to lengths. */
export function parseChromSizes(text: string): ChromSizes {
  if (typeof text !== "string") {
    throw new TypeError("Chromosome sizes must be provided as text");
  }

  const sizes = Object.create(null) as Record<string, number>;
  let entryCount = 0;

  for (const [index, sourceLine] of text.split(/\r?\n/).entries()) {
    const line = sourceLine.trim();
    if (line.length === 0) continue;

    const fields = line.split(/\s+/);
    if (fields.length !== 2) {
      throw new Error(`Invalid chrom.sizes line ${index + 1}: expected a name and length`);
    }

    const [name, lengthText] = fields;
    if (name.length === 0 || lengthText === undefined || !/^[1-9]\d*$/.test(lengthText)) {
      throw new Error(`Invalid chrom.sizes line ${index + 1}: length must be a positive integer`);
    }
    if (Object.hasOwn(sizes, name)) {
      throw new Error(`Invalid chrom.sizes line ${index + 1}: duplicate sequence "${name}"`);
    }

    const length = Number(lengthText);
    if (!Number.isSafeInteger(length)) {
      throw new Error(`Invalid chrom.sizes line ${index + 1}: length must be a safe integer`);
    }

    sizes[name] = length;
    entryCount += 1;
  }

  if (entryCount === 0) {
    throw new Error("Invalid chrom.sizes file: expected at least one entry");
  }

  return Object.freeze(sizes);
}

/** Fetches and parses a public HTTP(S) chrom.sizes file. */
export async function readChromSizes(options: ReadChromSizesOptions): Promise<ChromSizes> {
  if (typeof options !== "object" || options === null) {
    throw new TypeError("Chromosome sizes options must be an object");
  }

  const url = validateHttpUrl(options.url);
  throwIfAborted(options.signal);
  const response = await fetch(url, { signal: options.signal });
  throwIfAborted(options.signal);

  if (!response.ok) {
    throw new Error(`Failed to read chrom.sizes file: received HTTP ${response.status}`);
  }

  const text = await response.text();
  throwIfAborted(options.signal);
  return parseChromSizes(text);
}
