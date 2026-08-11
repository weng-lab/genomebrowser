export type ReaderErrorContext = Readonly<
  Record<string, string | number | boolean | bigint | null | undefined>
>;

export type ReaderErrorOptions = {
  cause?: unknown;
  context?: ReaderErrorContext;
};

/** Base error for failures owned by the genomic reader package. */
export class GenomicReaderError extends Error {
  readonly context: ReaderErrorContext;

  constructor(message: string, options: ReaderErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "GenomicReaderError";
    this.context = Object.freeze({ ...options.context });
  }
}

/** Indicates malformed, unsupported, or truncated binary input. */
export class BinaryParseError extends GenomicReaderError {
  constructor(message: string, options: ReaderErrorOptions = {}) {
    super(message, options);
    this.name = "BinaryParseError";
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "name" in error && error.name === "AbortError"
  );
}

/** Adds package context to a failure while leaving native abort failures untouched. */
export function withReaderErrorContext<T>(
  error: T,
  message: string,
  context: ReaderErrorContext = {},
): T | GenomicReaderError {
  if (isAbortError(error)) {
    return error;
  }

  return new GenomicReaderError(message, { cause: error, context });
}
