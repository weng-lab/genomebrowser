import { getMcpEndpoint } from "../../../composition/server";

// Seconds. Outlasts every command's time limit, the longest being add_tracks_from_urls at 45.
export const maxDuration = 60;

function handle(request: Request) {
  return getMcpEndpoint().fetch(request);
}

export { handle as GET, handle as POST, handle as DELETE };
