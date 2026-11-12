import { HttpStatusError } from "@weng-lab/genomic-reader";

/**
 * Why a track's file failed its check:
 * - `INVALID_URL`: the URL is not an absolute HTTP(S) URL.
 * - `UNREACHABLE`: the request failed, with `status` when the host answered with one.
 * - `NO_RANGE_SUPPORT`: the host sent the whole file instead of the requested byte range.
 * - `UNREADABLE`: the host answered, but the file cannot be read by this track type, with
 *   `status` 416 when the file ends before data its header points to.
 */
export type TrackFileErrorCode = "INVALID_URL" | "UNREACHABLE" | "NO_RANGE_SUPPORT" | "UNREADABLE";

/** A file named by a track config that the track could not read. */
export class TrackFileError extends Error {
  readonly code: TrackFileErrorCode;
  /** The config field holding the file's URL, such as `url` or `indexUrl`. */
  readonly field: string;
  /** The HTTP status the host answered with, when the failure was one. */
  readonly status?: number;

  constructor(
    code: TrackFileErrorCode,
    field: string,
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "TrackFileError";
    this.code = code;
    this.field = field;
    if (options?.status !== undefined) this.status = options.status;
  }
}

export type TrackFileCheckOptions = { signal?: AbortSignal };

/** The config field naming a file, and how messages refer to the file. */
export type TrackFile = { field: string; name: string };

/** Creates a reader for a file, reporting a URL the reader rejects. */
export function openTrackFile<File>(file: TrackFile, create: () => File): File {
  try {
    return create();
  } catch (error) {
    throw new TrackFileError(
      "INVALID_URL",
      file.field,
      `The ${file.name} URL is not an absolute HTTP or HTTPS URL.`,
      { cause: error },
    );
  }
}

/** Runs a read of a file, reporting why it failed. An abort rejects with the signal's reason. */
export async function readTrackFile<T>(
  file: TrackFile,
  read: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw describeReadFailure(file, error);
  }
}

function describeReadFailure(file: TrackFile, error: unknown): TrackFileError {
  if (error instanceof HttpStatusError) {
    // Range reads expect 206; a 200 carries the whole file because the host ignores ranges.
    if (error.status === 200)
      return new TrackFileError(
        "NO_RANGE_SUPPORT",
        file.field,
        `The ${file.name} host does not support byte-range requests.`,
        { status: error.status, cause: error },
      );
    // Range Not Satisfiable: the range starts past the end of the file.
    if (error.status === 416)
      return new TrackFileError(
        "UNREADABLE",
        file.field,
        `The ${file.name} ends before data its header points to, so it may be incomplete.`,
        { status: error.status, cause: error },
      );
    return new TrackFileError(
      "UNREACHABLE",
      file.field,
      `The ${file.name} request returned HTTP ${error.status}.`,
      { status: error.status, cause: error },
    );
  }
  // The reader passes on fetch's TypeError for network failures, including requests CORS blocks.
  // It reports problems inside a file with other errors.
  if (error instanceof TypeError)
    return new TrackFileError(
      "UNREACHABLE",
      file.field,
      `The ${file.name} could not be reached. Check the URL, and that its host allows requests from other sites (CORS).`,
      { cause: error },
    );
  const reason = error instanceof Error ? error.message : String(error);
  return new TrackFileError(
    "UNREADABLE",
    file.field,
    `The ${file.name} could not be read: ${reason}`,
    { cause: error },
  );
}
