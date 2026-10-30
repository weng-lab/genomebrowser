import type { SaveEvent, SaveLifecycle, SaveMachine } from "./saveLifecycle";

export function saveReducer(state: SaveLifecycle, event: SaveEvent): SaveLifecycle {
  switch (event.type) {
    case "START":
      return state.tag === "idle" ? { tag: "writing", request: event.request, failures: 0 } : state;
    case "ACK":
      return state.tag === "writing" ? { tag: "idle" } : state;
    case "FAIL": {
      if (state.tag !== "writing") return state;
      switch (event.failure.code) {
        case "UNAVAILABLE":
          return { ...state, failures: state.failures + 1 };
        case "INVALID_INPUT":
          return { tag: "idle" };
        case "CONFLICT":
          return { tag: "conflict", failure: event.failure };
        default:
          return { tag: "ended", failure: event.failure };
      }
    }
    case "RESOLVE":
      return state.tag === "conflict" ? { tag: "idle" } : state;
    case "END":
      return { tag: "ended", failure: event.failure };
  }
}

export function createSaveReducer(): SaveMachine {
  let state: SaveLifecycle = { tag: "idle" };
  let stopped = false;
  return {
    getState: () => state,
    send(event) {
      if (!stopped) state = saveReducer(state, event);
    },
    stop() {
      stopped = true;
    },
  };
}
