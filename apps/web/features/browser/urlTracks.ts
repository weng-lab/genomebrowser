import type { AnyTrackInstance, TrackMetadata, TrackStoreInstance } from "@weng-lab/genomebrowser";
import { bamModule, checkBamFiles } from "@weng-lab/genomebrowser-tracks/bam";
import { bigBedModule, checkBigBedFiles } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bigWigModule, checkBigWigFiles } from "@weng-lab/genomebrowser-tracks/bigwig";
import { ccreBigBedModule, checkCcreBigBedFiles } from "@weng-lab/genomebrowser-tracks/ccre";
import { checkGeneFiles, geneModule } from "@weng-lab/genomebrowser-tracks/gene";
import { TrackFileError } from "@weng-lab/genomebrowser-tracks/shared";
import { maxSessionTracks } from "../sessions/schema";
import { maxTrackMetadataBytes, metadataBytes } from "./trackMetadata";
import {
  urlTrackTypeSchema,
  type BigBedPreset,
  type TrackVisibility,
  type UrlTrackType,
} from "./urlTrackTypes";

/** A file URL to add as a track, and the choices that the URL alone cannot make. */
export type TrackRequest = {
  url: string;
  /** Inferred from the URL's file extension when omitted. */
  type?: UrlTrackType;
  /** The file name, without its extension, when omitted. */
  title?: string;
  /** For BAM: the BAI index, which defaults to the BAM URL with `.bai` added to its path. */
  indexUrl?: string;
  /**
   * For BigBed: the columns to read. When omitted, the file's header chooses them. A given
   * preset is checked only against the file's total column count.
   */
  bedSchema?: BigBedPreset;
  /** `#RRGGBB`. The type's default color when omitted. */
  color?: string;
  /** Shown as the nearest display the type has. The type's default display when omitted. */
  visibility?: TrackVisibility;
  /** Copied onto the track. At most `maxTrackMetadataBytes` as JSON. */
  metadata?: TrackMetadata;
};

export type AddedUrlTrack = { id: string; title: string; type: UrlTrackType };

type Failure = { ok: false; code: string; error: string };
/** The tracks a batch added, in order, or why it added none. */
export type UrlTracksOutcome = { ok: true; tracks: AddedUrlTrack[] } | Failure;
type ResolvedTrack = { ok: true; track: AnyTrackInstance; added: AddedUrlTrack };

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

// The display each type shows for a visibility: the nearest one it has. Change the mapping here.
const visibilityDisplays = {
  bigwig: { dense: "dense", squish: "full", pack: "full", full: "full" },
  bigbed: { dense: "dense", squish: "squish", pack: "squish", full: "squish" },
  "ccre-bigbed": { dense: "dense", squish: "squish", pack: "squish", full: "squish" },
  gene: { dense: "merged", squish: "merged", pack: "tagged", full: "full" },
  bam: { dense: "dense", squish: "squish", pack: "pack", full: "full" },
} as const satisfies Record<UrlTrackType, Record<TrackVisibility, string>>;

type Base = { id: string; title: string };

// Checks the files each type reads, then creates the track from the config the check returns.
const createTrack: Record<
  UrlTrackType,
  (request: TrackRequest, url: URL, base: Base, signal: AbortSignal) => Promise<AnyTrackInstance>
> = {
  bigwig: async (request, _, base, signal) =>
    bigWigModule.create({
      ...createInput(request, base, visibilityDisplays.bigwig),
      config: await checkBigWigFiles({ url: request.url }, { signal }),
    }),
  bigbed: async ({ url, bedSchema, ...request }, _, base, signal) =>
    bigBedModule.create({
      ...createInput(request, base, visibilityDisplays.bigbed),
      config: await checkBigBedFiles({ url, bedSchema }, { signal }),
    }),
  gene: async (request, _, base, signal) =>
    geneModule.create({
      ...createInput(request, base, visibilityDisplays.gene),
      config: await checkGeneFiles({ url: request.url }, { signal }),
    }),
  "ccre-bigbed": async (request, _, base, signal) =>
    ccreBigBedModule.create({
      ...createInput(request, base, visibilityDisplays["ccre-bigbed"]),
      config: await checkCcreBigBedFiles({ url: request.url }, { signal }),
    }),
  bam: async ({ url, indexUrl, ...request }, parsed, base, signal) => {
    const files = { url, indexUrl: indexUrl ?? withPathSuffix(parsed, ".bai") };
    return bamModule.create({
      ...createInput(request, base, visibilityDisplays.bam),
      config: await checkBamFiles(files, { signal }),
    });
  },
};

/** The parts of a track's creation that its files don't decide, given its type's displays. */
function createInput<Display extends string>(
  { color, visibility, metadata }: Pick<TrackRequest, "color" | "visibility" | "metadata">,
  base: Base,
  displays: Readonly<Record<TrackVisibility, Display>>,
) {
  return {
    base: {
      ...base,
      ...(color && { color }),
      ...(visibility && { display: displays[visibility] }),
    },
    ...(metadata && { metadata }),
  };
}

/**
 * Check that the browser can read each URL's files as a track, then add the tracks below the
 * others, in order, where the session saves them. Adds every track or none: nothing is added
 * when any URL is not a readable file of a supported type, a request's metadata is too large,
 * the session lacks room for every track, or `signal` aborts first.
 */
export async function addTracksFromUrls(
  trackStore: TrackStoreInstance,
  requests: readonly TrackRequest[],
  signal: AbortSignal,
): Promise<UrlTracksOutcome> {
  const refused = limitFailure(trackStore, requests.length);
  if (refused) return refused;
  let results: (ResolvedTrack | Failure)[];
  try {
    results = await Promise.all(requests.map((request) => resolveTrack(request, signal)));
  } catch (error) {
    if (signal.aborted) return cancelled();
    throw error;
  }
  // A check can finish just after its command is cancelled or expires.
  if (signal.aborted) return cancelled();
  const resolved: ResolvedTrack[] = [];
  const failures: string[] = [];
  for (const [index, result] of results.entries()) {
    if (result.ok) resolved.push(result);
    else failures.push(`${requests[index].url}: ${result.code}: ${result.error}`);
  }
  if (failures.length > 0)
    return failure("TRACKS_NOT_ADDED", `No tracks were added. ${failures.join(" ")}`);
  // Commands run concurrently, so another add may have filled the session during the checks.
  const filled = limitFailure(trackStore, requests.length);
  if (filled) return filled;
  const applied = trackStore
    .getState()
    .applyTrackChanges({ add: resolved.map(({ track }) => track) });
  if (!applied.ok) return applied;
  return { ok: true, tracks: resolved.map(({ added }) => added) };
}

/** Infers a URL's track type and title, then checks its files. An abort rejects. */
async function resolveTrack(
  request: TrackRequest,
  signal: AbortSignal,
): Promise<ResolvedTrack | Failure> {
  const url = parseUrl(request.url);
  if (!url) return failure("INVALID_URL", "The URL is not an absolute HTTP or HTTPS URL.");
  if (request.metadata && metadataBytes(request.metadata) > maxTrackMetadataBytes)
    return failure(
      "METADATA_TOO_LARGE",
      `The metadata is more than ${maxTrackMetadataBytes.toLocaleString("en-US")} bytes as JSON. Remove fields or shorten values.`,
    );
  const path = url.pathname.toLowerCase();
  const extension = extensionTypes.find(([extension]) => path.endsWith(extension));
  const type = request.type ?? extension?.[1];
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
  const base = {
    id: crypto.randomUUID(),
    title: request.title?.trim() || fileTitle(url, extension?.[0]),
  };
  try {
    const track = await createTrack[type](request, url, base, signal);
    return { ok: true, track, added: { ...base, type } };
  } catch (error) {
    if (!signal.aborted && error instanceof TrackFileError)
      return failure(error.code, error.message);
    throw error;
  }
}

function failure(code: string, error: string): Failure {
  return { ok: false, code, error };
}

function cancelled() {
  return failure("CANCELLED", "Adding the tracks was cancelled.");
}

/** Refuses a batch the session has no room for. */
function limitFailure(trackStore: TrackStoreInstance, adding: number) {
  const count = trackStore.getState().tracks.length;
  if (count + adding <= maxSessionTracks) return undefined;
  const room = Math.max(0, maxSessionTracks - count);
  return failure(
    "TRACK_LIMIT",
    `A session holds at most ${maxSessionTracks} tracks. This one has ${count}, which leaves room for ${room}, not ${adding}. No tracks were added.`,
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
