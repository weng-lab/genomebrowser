import { defineDynamic, defineMcpClientConnection } from "eve/connections";
import { issueCommandCredential } from "../../features/agent/server/credential";
import { agentAppOrigin, agentDeploymentHeaders } from "../../features/agent/server/deployment";
import { sessionIdSchema } from "../../features/sessions/schema";

export default defineDynamic(() =>
  defineMcpClientConnection({
    url: new URL("/api/mcp", agentAppOrigin()).href,
    headers: agentDeploymentHeaders,
    description:
      "Control the user's open genome browser session: inspect tracks, navigate to coordinates, add URL tracks, sort tracks, edit track metadata, and export images.",
    instanceKey: "genomebrowser",
    auth: (ctx) => ({
      principalType: "user",
      async getToken() {
        const caller = ctx.session.auth.initiator;
        const current = ctx.session.auth.current;
        const userId = caller?.attributes.userId;
        if (typeof userId !== "string" || !userId) throw new Error("Sign in to use browser tools");
        // Tools act for the user and session that started the conversation; anyone else's turn gets none.
        if (
          current?.attributes.userId !== userId ||
          current.attributes.browserSessionId !== caller?.attributes.browserSessionId
        )
          throw new Error("Browser tools act only for the session that started this conversation");
        return issueCommandCredential(
          userId,
          sessionIdSchema.parse(caller?.attributes.browserSessionId),
        );
      },
    }),
    toolCall: {
      providedArguments: {
        sessionId: (ctx) =>
          sessionIdSchema.parse(ctx.session.auth.initiator?.attributes.browserSessionId),
      },
    },
  }),
);
