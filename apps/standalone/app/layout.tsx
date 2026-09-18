import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MuiXLicenseProvider } from "../components/MuiXLicenseProvider";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";

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
        <AppRouterCacheProvider>
          <MuiXLicenseProvider>{children}</MuiXLicenseProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
