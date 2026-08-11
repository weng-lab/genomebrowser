import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MuiXLicenseProvider } from "../components/MuiXLicenseProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genome Browser Framework Comparison",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <MuiXLicenseProvider>{children}</MuiXLicenseProvider>
      </body>
    </html>
  );
}
