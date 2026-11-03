import { defineDynamic } from "eve";
import { defineMcpClientConnection } from "eve/connections";
import { sessionIdSchema } from "../../features/sessions/schema";
import { issueCommandCredential } from "../../features/agent/server/credential";
import { agentAppOrigin, agentDeploymentHeaders } from "../../features/agent/server/deployment";

export default defineDynamic(() =>
  defineMcpClientConnection({
    url: new URL("/api/mcp", agentAppOrigin()).href,
    headers: agentDeploymentHeaders,
    description:
      "Control the user's open genome browser: navigate to coordinates and export browser images.",
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
