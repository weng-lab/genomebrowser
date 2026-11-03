import "server-only";
import { auth } from "@clerk/nextjs/server";
import { readCommandCredential } from "./credential";

/** External clients use Clerk OAuth/session bearer tokens. Eve uses a scoped app credential. */
export async function authenticateMcp(request: Request) {
  const match = /^Bearer (\S+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) return null;
  if (match[1].startsWith("gbmcp_")) return readCommandCredential(match[1]);
  const caller = await auth({ acceptsToken: ["oauth_token", "session_token"] });
  if (!caller.isAuthenticated) return null;
  if (caller.tokenType === "oauth_token") return { userId: caller.subject };
  return { userId: caller.userId };
}
