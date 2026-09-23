import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isAuthConfigured } from "./features/auth/config";

const authenticate = clerkMiddleware();

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isAuthConfigured()) return NextResponse.next();
  return authenticate(request, event);
}

// Initialize Clerk here; private resources enforce authorization at data access.
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|txt|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
