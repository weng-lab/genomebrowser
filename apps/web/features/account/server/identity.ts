import "server-only";
import { auth } from "@clerk/nextjs/server";

/** The acting user of the current request, or null when signed out. Resolve it for every operation. */
export type Identity = { userId(): Promise<string | null> };

/** The signed-in Clerk user. `auth()` requires the request to pass through the proxy. */
export const clerkIdentity: Identity = {
  async userId() {
    return (await auth()).userId;
  },
};

/**
 * Fails unless both Clerk keys are configured. Without them, Clerk would start
 * keyless development mode with a temporary application instead of the
 * project's instance, so requests fail rather than sign users in elsewhere.
 * Builds read no keys.
 */
export function requireClerkKeys(env: NodeJS.ProcessEnv) {
  const missing = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"].filter(
    (name) => !env[name],
  );
  if (missing.length)
    throw new Error(`${missing.join(" and ")} must be set to the project's Clerk instance keys`);
}

/**
 * The Clerk user an agent request acts for: a signed-in session, or an OAuth
 * access token Clerk issued to an agent the user authorized.
 */
export const clerkAgentIdentity: Identity = {
  async userId() {
    const caller = await auth({ acceptsToken: ["session_token", "oauth_token"] });
    if (!caller.isAuthenticated) return null;
    return caller.tokenType === "oauth_token" ? caller.subject : caller.userId;
  },
};
