"use client";

import dynamic from "next/dynamic";

const AppNavbar = dynamic(() => import("./AppNavbar").then((module) => module.AppNavbar), {
  ssr: false,
});

export function AppNavbarRoute() {
  return <AppNavbar />;
}
