import type { AnyTrackInstance, TrackStoreInstance } from "@weng-lab/genomebrowser";
import { bamModule, checkBamFiles } from "@weng-lab/genomebrowser-tracks/bam";
import { bigBedModule, checkBigBedFiles } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bigWigModule, checkBigWigFiles } from "@weng-lab/genomebrowser-tracks/bigwig";
import { ccreBigBedModule, checkCcreBigBedFiles } from "@weng-lab/genomebrowser-tracks/ccre";
import { checkGeneFiles, geneModule } from "@weng-lab/genomebrowser-tracks/gene";
import { TrackFileError } from "@weng-lab/genomebrowser-tracks/shared";
import { urlTrackTypeSchema, type UrlTrackType } from "./urlTrackTypes";

/** A file URL to add as a track, and the choices that the URL alone cannot make. */
export type UrlTrackInput = {
  url: string;
  /** Inferred from the URL's file extension when omitted. */
  type?: UrlTrackType;
  /** The file name, without its extension, when omitted. */
  title?: string;
  /** For BAM: the BAI index, which defaults to the BAM URL with `.bai` added to its path. */
  indexUrl?: string;
};

export type AddedUrlTrack = { id: string; title: string; type: UrlTrackType };

/** The most tracks a session holds. Adding a track to a full session is refused. */
export const maxSessionTracks = 50;

type UrlTrackOutcome =
  | { ok: true; track: AddedUrlTrack }
  | { ok: false; code: string; error: string };

// File extensions that name a track type, matched case-insensitively at the end of the path.
const extensionTypes: [extension: string, type: UrlTrackType][] = [
  [".bigwig", "bigwig"],
  [".bw", "bigwig"],
  [".bigbed", "bigbed"],
  [".bb", "bigbed"],
  [".bam", "bam"],
];

// Plain-text formats the browser cannot read, matched the same way after any `.gz`, with the
// indexed format each converts to and the UCSC tool that converts it.
const textFormats: [extension: string, format: string, target: string, tool: string][] = [
  [".bed", "BED", "BigBed", "bedToBigBed"],
  [".bedgraph", "bedGraph", "BigWig", "bedGraphToBigWig"],
  [".wig", "WIG", "BigWig", "wigToBigWig"],
];

type Base = { id: string; title: string };

// Checks the files each type reads, then creates the track from the config the check returns.
const createTrack: Record<
  UrlTrackType,
  (input: UrlTrackInput, url: URL, base: Base, signal: AbortSignal) => Promise<AnyTrackInstance>
> = {
  bigwig: async ({ url }, _, base, signal) =>
    bigWigModule.create({ base, config: await checkBigWigFiles({ url }, { signal }) }),
  bigbed: async ({ url }, _, base, signal) =>
    bigBedModule.create({ base, config: await checkBigBedFiles({ url }, { signal }) }),
  gene: async ({ url }, _, base, signal) =>
    geneModule.create({ base, config: await checkGeneFiles({ url }, { signal }) }),
  "ccre-bigbed": async ({ url }, _, base, signal) =>
    ccreBigBedModule.create({ base, config: await checkCcreBigBedFiles({ url }, { signal }) }),
  bam: async ({ url, indexUrl }, parsed, base, signal) => {
    const files = { url, indexUrl: indexUrl ?? withPathSuffix(parsed, ".bai") };
    return bamModule.create({ base, config: await checkBamFiles(files, { signal }) });
  },
};

/**
 * Check that the browser can read a URL's files as a track, then add the track below the
 * others, where the session saves it. Adds nothing when the URL is not a readable file of a
 * supported type, the session already has `maxSessionTracks` tracks, or `signal` aborts first.
 */
export async function addTrackFromUrl(
  trackStore: TrackStoreInstance,
  input: UrlTrackInput,
  signal: AbortSignal,
): Promise<UrlTrackOutcome> {
  const url = parseUrl(input.url);
  if (!url) return failure("INVALID_URL", "The URL is not an absolute HTTP or HTTPS URL.");
  const path = url.pathname.toLowerCase();
  const extension = extensionTypes.find(([extension]) => path.endsWith(extension));
  const type = input.type ?? extension?.[1];
  if (!type) {
    const unzipped = path.replace(/\.gz$/, "");
    const text = textFormats.find(([extension]) => unzipped.endsWith(extension));
    if (text) {
      const [, format, target, tool] = text;
      return failure(
        "UNSUPPORTED_FORMAT",
        `The URL names a plain-text ${format} file, which the browser cannot read. Convert it to ${target} with UCSC's ${tool}, then add the ${target} file's URL.`,
      );
    }
    const types = urlTrackTypeSchema.options.join(", ");
    return failure(
      "UNKNOWN_TYPE",
      `The track type cannot be inferred from the URL. Choose one of: ${types}.`,
    );
  }
  const title = input.title?.trim() || fileTitle(url, extension?.[0]);
  if (isFull(trackStore)) return full();
  try {
    const track = await createTrack[type](input, url, { id: crypto.randomUUID(), title }, signal);
    // A check can finish just after its command is cancelled or expires.
    if (signal.aborted) return cancelled();
    // Commands run concurrently, so another add may have filled the session during the check.
    if (isFull(trackStore)) return full();
    const added = trackStore.getState().addTrack(track);
    if (!added.ok) return added;
    return { ok: true, track: { id: track.base.id, title, type } };
  } catch (error) {
    if (signal.aborted) return cancelled();
    if (error instanceof TrackFileError) return failure(error.code, error.message);
    throw error;
  }
}

function failure(code: string, error: string) {
  return { ok: false as const, code, error };
}

function cancelled() {
  return failure("CANCELLED", "Adding the track was cancelled.");
}

function isFull(trackStore: TrackStoreInstance) {
  return trackStore.getState().tracks.length >= maxSessionTracks;
}

function full() {
  return failure(
    "TRACK_LIMIT",
    `The session already has ${maxSessionTracks} tracks, the most it can hold. Remove a track before adding another.`,
  );
}

/** The URL, when it is an absolute HTTP or HTTPS URL. */
function parseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** The file name from the URL's path, without the extension that named its type. */
function fileTitle(url: URL, extension?: string) {
  const encoded = url.pathname.split("/").at(-1) ?? "";
  const name = extension ? encoded.slice(0, -extension.length) : encoded;
  try {
    return decodeURIComponent(name) || url.hostname;
  } catch {
    // A malformed escape, such as a lone %, keeps its encoded form.
    return name || url.hostname;
  }
}

function withPathSuffix(url: URL, suffix: string) {
  const suffixed = new URL(url);
  suffixed.pathname += suffix;
  return suffixed.href;
}
