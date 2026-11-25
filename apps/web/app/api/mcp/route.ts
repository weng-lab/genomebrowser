import { getMcpEndpoint } from "../../../composition/server";

// Seconds. Must outlast `longestCommandMs` in features/agent/commands/define.ts.
export const maxDuration = 60;

function handle(request: Request) {
  return getMcpEndpoint().fetch(request);
}

export { handle as GET, handle as POST, handle as DELETE };
