import { defineHook } from "eve/hooks";
import { tabPresence } from "../../features/agent/server/tabPresence";

/** How long a run waits for its session's tab to come back, as after a reload, before it stops. */
const graceMs = Number(process.env.GB_AGENT_TAB_GRACE_MS) || 5_000;

// The agent acts only through the tab that holds its session, so a run stops
// once no tab has held the session for the grace period: closing the tab ends
// it. When Redis cannot tell, the turn goes on; its tools fail on their own.
export default defineHook({
  events: {
    async "model.requested"(event, ctx) {
      // Compaction also calls the model, but only a turn can be cancelled.
      if (!("turnId" in event.data.owner)) return;
      const sessionId = ctx.session.auth.initiator?.attributes.browserSessionId;
      if (typeof sessionId !== "string") return;
      const presence = await tabPresence(sessionId, graceMs, ctx.occurrence.abortSignal);
      if (presence === "absent") ctx.cancel("The session is no longer open in a browser tab");
    },
  },
});
