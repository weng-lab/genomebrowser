import type { SessionRequestError } from "./transport";

export type SaveRequest = { body: string; revision: number; saveId: string };
/** A blocked lifecycle cannot simultaneously retain a request or a retry counter. */
export type SaveLifecycle =
  | { tag: "idle" }
  | { tag: "writing"; request: SaveRequest; failures: number }
  | { tag: "conflict"; failure: SessionRequestError }
  | { tag: "ended"; failure: SessionRequestError };
export type SaveEvent =
  | { type: "START"; request: SaveRequest }
  | { type: "ACK" }
  | { type: "FAIL"; failure: SessionRequestError }
  | { type: "RESOLVE" }
  | { type: "END"; failure: SessionRequestError };
export type SaveMachine = {
  getState(): SaveLifecycle;
  send(event: SaveEvent): void;
  stop(): void;
};
