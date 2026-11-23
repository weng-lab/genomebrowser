import { defineDynamic, defineInstructions } from "eve/instructions";
import { z } from "zod";
import { issueCommandCredential } from "../../features/agent/server/credential";
import { agentAppOrigin, agentDeploymentHeaders } from "../../features/agent/server/deployment";

const contextSchema = z.object({
  sessionId: z.string(),
  title: z.string(),
  assembly: z.string(),
  summary: z.string().nullable(),
});

/** Ask the app for what the agent should know about its session, with Eve's scoped credential. */
async function sessionContext(userId: string, sessionId: string) {
  const { token } = await issueCommandCredential(userId, sessionId);
  const response = await fetch(
    new URL(`/api/sessions/${sessionId}/agent-context`, agentAppOrigin()),
    {
      headers: { ...(await agentDeploymentHeaders()), authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`The session's context is unavailable (${response.status})`);
  return contextSchema.parse(await response.json());
}

// The session's facts and the summary of its earlier threads, read once per
// message so a rename or a new rollover applies from the next message on.
export default defineDynamic(async (ctx) => {
  const caller = ctx.session.auth.initiator?.attributes;
  if (!ctx.turn || typeof caller?.userId !== "string") return null;
  if (typeof caller.browserSessionId !== "string") return null;
  const { userId, browserSessionId } = caller;
  const context = await ctx
    .memo(["session-context", ctx.turn.id], () => sessionContext(userId, browserSessionId))
    .catch((error: unknown) => {
      console.error("Could not load the agent's session context", error);
      return null;
    });
  if (!context) return null;
  const lines = [
    `You are working in the saved session "${context.title}" (ID ${context.sessionId}) on the ${context.assembly} assembly.`,
  ];
  if (context.summary)
    lines.push(
      "",
      "Earlier conversations in this session, summarized. The browser may have changed since, so check it with your tools before relying on a remembered region or track:",
      "",
      context.summary,
    );
  return defineInstructions({ content: lines.join("\n") });
});
