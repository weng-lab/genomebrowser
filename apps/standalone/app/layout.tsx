import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { isAuthConfigured } from "@/features/auth/config";
import { ActiveSessionProvider } from "@/features/sessions/activeSession";
import { MuiXLicenseProvider } from "@/features/site/MuiXLicenseProvider";
import { SiteFooter } from "@/features/site/SiteFooter";
import { SiteHeader } from "@/features/site/SiteHeader";
import { SiteTheme } from "@/features/site/SiteTheme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "UMass Chan Genome Browser", template: "%s | UMass Chan Genome Browser" },
  description:
    "Explore human reference genes, regulatory elements, and genomic signal in the UMass Chan Genome Browser.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const authConfigured = isAuthConfigured();
  const site = (
    <AppRouterCacheProvider>
      <SiteTheme>
        <MuiXLicenseProvider>
          <ActiveSessionProvider authConfigured={authConfigured}>
            <div className="site-shell">
              <a className="skip-link" href="#main-content">
                Skip to content
              </a>
              <SiteHeader authConfigured={authConfigured} />
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <SiteFooter />
            </div>
          </ActiveSessionProvider>
        </MuiXLicenseProvider>
      </SiteTheme>
    </AppRouterCacheProvider>
  );
  return (
    <html lang="en">
      <body>
        <Analytics />
        <AuthProvider enabled={authConfigured}>{site}</AuthProvider>
      </body>
    </html>
  );
}
