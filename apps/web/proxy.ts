import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextProxy } from "next/server";
import { identityMode, signInPath } from "./features/account/server/identity";

// With `CLERK_JWT_KEY`, Clerk verifies session tokens without fetching its signing keys.
const clerk = clerkMiddleware({ signInUrl: signInPath, jwtKey: process.env.CLERK_JWT_KEY });

/** Clerk authenticates each request for `auth()`. Mock identity skips Clerk entirely. */
export const proxy: NextProxy = (request, event) =>
  identityMode(process.env) === "mock" ? NextResponse.next() : clerk(request, event);

export const config = {
  // Clerk's recommended matcher: every route except Next internals and static files.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api(.*)",
  ],
};
