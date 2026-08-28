import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNavbarRoute } from "../components/AppNavbarRoute";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Genome browser playground",
    template: "%s | Genome browser playground",
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AppNavbarRoute />
        {children}
      </body>
    </html>
  );
}
