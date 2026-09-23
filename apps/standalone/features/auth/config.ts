import "server-only";

// Public browsing is available even when this deployment has no Clerk application.
export function isAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}
