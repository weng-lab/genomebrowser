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
        const userId = caller?.attributes.userId;
        if (typeof userId !== "string" || !userId) throw new Error("Sign in to use browser tools");
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
