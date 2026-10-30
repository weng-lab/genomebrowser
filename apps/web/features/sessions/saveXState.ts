import { assign, createActor, setup } from "xstate";
import type { SaveEvent, SaveLifecycle, SaveMachine } from "./saveLifecycle";

const machine = setup({
  types: { context: {} as { lifecycle: SaveLifecycle }, events: {} as SaveEvent },
  actions: {
    start: assign(({ event }) => {
      if (event.type !== "START") throw new Error("START required");
      return { lifecycle: { tag: "writing" as const, request: event.request, failures: 0 } };
    }),
    idle: assign(() => ({ lifecycle: { tag: "idle" as const } })),
    retry: assign(({ context }) => {
      if (context.lifecycle.tag !== "writing") throw new Error("No request to retry");
      return { lifecycle: { ...context.lifecycle, failures: context.lifecycle.failures + 1 } };
    }),
    conflict: assign(({ event }) => {
      if (event.type !== "FAIL") throw new Error("FAIL required");
      return { lifecycle: { tag: "conflict" as const, failure: event.failure } };
    }),
    end: assign(({ event }) => {
      if (event.type !== "FAIL" && event.type !== "END") throw new Error("Failure required");
      return { lifecycle: { tag: "ended" as const, failure: event.failure } };
    }),
  },
}).createMachine({
  context: { lifecycle: { tag: "idle" } },
  initial: "idle",
  on: { END: { target: ".ended", actions: "end" } },
  states: {
    idle: { on: { START: { target: "writing", actions: "start" } } },
    writing: {
      on: {
        ACK: { target: "idle", actions: "idle" },
        FAIL: [
          { guard: ({ event }) => event.failure.code === "UNAVAILABLE", actions: "retry" },
          {
            guard: ({ event }) => event.failure.code === "INVALID_INPUT",
            target: "idle",
            actions: "idle",
          },
          {
            guard: ({ event }) => event.failure.code === "CONFLICT",
            target: "conflict",
            actions: "conflict",
          },
          { target: "ended", actions: "end" },
        ],
      },
    },
    conflict: { on: { RESOLVE: { target: "idle", actions: "idle" } } },
    ended: {},
  },
});

export function createSaveXState(): SaveMachine {
  const actor = createActor(machine).start();
  return {
    getState: () => actor.getSnapshot().context.lifecycle,
    send: (event) => actor.send(event),
    stop: () => actor.stop(),
  };
}
