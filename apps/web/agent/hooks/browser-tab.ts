import { defineHook } from "eve/hooks";
import { waitForTab } from "../../features/agent/server/tabPresence";

/** How long a run waits for its session's tab to come back, as after a reload, before it stops. */
const graceMs = Number(process.env.GB_AGENT_TAB_GRACE_MS) || 5_000;

// The agent acts only through the tab that holds its session, so a run stops
// once no tab has held the session for the grace period: closing the tab ends it.
export default defineHook({
  events: {
    async "model.requested"(_event, ctx) {
      const sessionId = ctx.session.auth.initiator?.attributes.browserSessionId;
      if (typeof sessionId !== "string") return;
      if (!(await waitForTab(sessionId, graceMs, ctx.occurrence.abortSignal)))
        ctx.cancel("The session is no longer open in a browser tab");
    },
  },
});
