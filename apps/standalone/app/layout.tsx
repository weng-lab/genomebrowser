import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MuiXLicenseProvider } from "../components/MuiXLicenseProvider";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "UMass Chan Genome Browser",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Analytics />
        <AppRouterCacheProvider>
          <MuiXLicenseProvider>{children}</MuiXLicenseProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
