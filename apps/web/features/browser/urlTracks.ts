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

/** The most tracks a session holds. A batch that does not fit is refused whole. */
export const maxSessionTracks = 50;

type Failure = { ok: false; code: string; error: string };
type UrlTracksOutcome = { ok: true; tracks: AddedUrlTrack[] } | Failure;
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
 * Check that the browser can read each URL's files as a track, then add the tracks below the
 * others, in order, where the session saves them. Adds every track or none: nothing is added
 * when any URL is not a readable file of a supported type, the session lacks room for every
 * track, or `signal` aborts first.
 */
export async function addTracksFromUrls(
  trackStore: TrackStoreInstance,
  inputs: readonly UrlTrackInput[],
  signal: AbortSignal,
): Promise<UrlTracksOutcome> {
  const refused = limitFailure(trackStore, inputs.length);
  if (refused) return refused;
  let results: (ResolvedTrack | Failure)[];
  try {
    results = await Promise.all(inputs.map((input) => resolveTrack(input, signal)));
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
    else failures.push(`${inputs[index].url}: ${result.code}: ${result.error}`);
  }
  if (failures.length > 0)
    return failure("TRACKS_NOT_ADDED", `No tracks were added. ${failures.join(" ")}`);
  // Commands run concurrently, so another add may have filled the session during the checks.
  const filled = limitFailure(trackStore, inputs.length);
  if (filled) return filled;
  const applied = trackStore
    .getState()
    .applyTrackChanges({ add: resolved.map(({ track }) => track) });
  if (!applied.ok) return applied;
  return { ok: true, tracks: resolved.map(({ added }) => added) };
}

/** Infers a URL's track type and title, then checks its files. An abort rejects. */
async function resolveTrack(
  input: UrlTrackInput,
  signal: AbortSignal,
): Promise<ResolvedTrack | Failure> {
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
  const base = {
    id: crypto.randomUUID(),
    title: input.title?.trim() || fileTitle(url, extension?.[0]),
  };
  try {
    const track = await createTrack[type](input, url, base, signal);
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
