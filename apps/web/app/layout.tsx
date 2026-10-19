import { ClerkProvider } from "@clerk/nextjs";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { identityMode, signInPath } from "../server/identity";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genomebrowser",
  description: "Explore genomic data in a shared browser workspace.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Identity is runtime configuration. Rendering per request keeps it out of the
  // build, which then needs no Clerk keys.
  await connection();
  const content = <AppRouterCacheProvider>{children}</AppRouterCacheProvider>;
  return (
    <html lang="en">
      <body>
        {identityMode(process.env) === "clerk" ? (
          <ClerkProvider signInUrl={signInPath}>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
