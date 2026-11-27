import type { CommandAgent } from "./commands/protocol";

/** How long the agent keeps control after taking it, unless it takes it again or gives it back. */
const holdMs = 120_000;

/**
 * Whether an agent holds the browser: while one does, the user's edits to the
 * session wait, like a mutex the agent takes for a workflow of several steps.
 * Control records which agent took it, so an agent gives back only its own:
 * it lifts when that agent releases it or its run ends or is stopped. It also
 * lifts when the user takes it back, when remote control detaches, or `holdMs`
 * after it was last taken, so a lock can never outlive its run for long.
 */
export function createAgentControl() {
  let holder: CommandAgent | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let cancelRun: (() => void) | undefined;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  function set(next: CommandAgent | undefined) {
    if (holder === next) return;
    holder = next;
    notify();
  }

  /** Lift control, whichever agent holds it. */
  function lift() {
    clearTimeout(expiry);
    set(undefined);
  }

  return {
    held: () => holder !== undefined,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    /** `agent` takes control, or keeps it for another `holdMs`. */
    take(agent: CommandAgent) {
      clearTimeout(expiry);
      expiry = setTimeout(lift, holdMs);
      set(agent);
    },
    /** `agent` gives control back, if it holds it. Without `agent`, control lifts whoever holds it. */
    release(agent?: CommandAgent) {
      if (agent === undefined || agent === holder) lift();
    },
    /**
     * Whether `stop` also stops the agent's run. Only a run of the agent panel
     * that holds control can be stopped from here; an agent connected another
     * way keeps working.
     */
    stops: () => holder === "panel" && cancelRun !== undefined,
    /** Give control back, stopping the agent's run when `stops` says it can be. */
    stop() {
      if (holder === "panel") cancelRun?.();
      lift();
    },
    /** While the agent panel has a run, Stop cancels it with `cancel`. */
    onStop(cancel: () => void) {
      cancelRun = cancel;
      notify();
      return () => {
        if (cancelRun !== cancel) return;
        cancelRun = undefined;
        notify();
      };
    },
  };
}

export type AgentControl = ReturnType<typeof createAgentControl>;
