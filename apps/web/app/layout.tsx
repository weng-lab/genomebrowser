import { ClerkProvider } from "@clerk/nextjs";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { signInPath } from "../features/account/signIn";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genomebrowser",
  description: "Explore genomic data in a shared browser workspace.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Clerk's keys are runtime configuration. Rendering per request keeps them out
  // of the build, which then needs no Clerk keys. The proxy rejects requests without them.
  await connection();
  return (
    <html lang="en">
      <body>
        <ClerkProvider signInUrl={signInPath}>
          <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
