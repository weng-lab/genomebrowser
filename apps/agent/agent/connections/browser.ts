import { sessionIdSchema } from "@weng-lab/contracts";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: `${process.env.GB_SERVER_URL ?? "http://127.0.0.1:3001"}/mcp`,
  description:
    "Control the connected genome browser: navigate to a genomic region or export an image.",
  protocolVersionDiscovery: false,
  tools: { allow: ["set_region", "export_image"] },
  toolCall: {
    providedArguments: {
      sessionId: ({ session }) =>
        sessionIdSchema.parse(session.auth.initiator?.attributes.browserSessionId),
    },
  },
});
