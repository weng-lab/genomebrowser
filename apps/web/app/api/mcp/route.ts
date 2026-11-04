import { getMcpEndpoint } from "../../../composition/server";

function handle(request: Request) {
  return getMcpEndpoint().fetch(request);
}

export { handle as GET, handle as POST, handle as DELETE };
