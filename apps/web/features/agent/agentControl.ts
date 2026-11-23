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

  function set(next: boolean) {
    if (held === next) return;
    held = next;
    for (const listener of listeners) listener();
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
    /** Stop the agent's run, as the panel's Stop does, and give control back. */
    stop() {
      cancelRun?.();
      release();
    },
    /** While the agent panel is open, Stop cancels its run with `cancel`. */
    onStop(cancel: () => void) {
      cancelRun = cancel;
      return () => {
        if (cancelRun === cancel) cancelRun = undefined;
      };
    },
  };
}

export type AgentControl = ReturnType<typeof createAgentControl>;
