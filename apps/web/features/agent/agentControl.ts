/** How long the agent keeps control after taking it, unless it takes it again or gives it back. */
const holdMs = 120_000;

/**
 * Whether the agent holds the browser: while it does, the user's edits to the
 * session wait, like a mutex the agent takes for a workflow of several steps.
 * Control lifts when the agent releases it, when its run ends or is stopped,
 * when remote control detaches, or `holdMs` after it was last taken, so a lock
 * can never outlive its run for long.
 */
export function createAgentControl() {
  let held = false;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let cancelRun: (() => void) | undefined;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  function set(next: boolean) {
    if (held === next) return;
    held = next;
    notify();
  }

  function release() {
    clearTimeout(expiry);
    set(false);
  }

  return {
    held: () => held,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    /** The agent takes control, or keeps it for another `holdMs`. */
    take() {
      clearTimeout(expiry);
      expiry = setTimeout(release, holdMs);
      set(true);
    },
    release,
    /**
     * Whether `stop` also stops the agent's run. Only a run of the agent panel
     * can be stopped from here; an agent connected another way keeps working.
     */
    stops: () => cancelRun !== undefined,
    /** Give control back, stopping the agent's run when `stops` says it can be. */
    stop() {
      cancelRun?.();
      release();
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
