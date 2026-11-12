/** A response whose HTTP status the reader cannot use, such as a 404 or a 200 to a range request. */
export class HttpStatusError extends Error {
  /** The response's HTTP status code. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpStatusError";
    this.status = status;
  }
}
