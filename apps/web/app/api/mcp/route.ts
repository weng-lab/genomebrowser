import { getMcpAccount } from "../../../composition/server";
import { getCommandRelay } from "../../../features/agent/commands/server/relay";
import { authenticateMcp } from "../../../features/agent/server/auth";
import { createGenomebrowserMcp } from "../../../features/agent/server/mcp";

export const maxDuration = 300;

// Lazy initialization lets builds run without Redis/database credentials.
let endpoint: ReturnType<typeof createGenomebrowserMcp> | undefined;
function handle(request: Request) {
  endpoint ??= createGenomebrowserMcp({
    authenticate: authenticateMcp,
    account: getMcpAccount,
    relay: getCommandRelay(),
  });
  return endpoint.fetch(request);
}

export { handle as GET, handle as POST, handle as DELETE };
