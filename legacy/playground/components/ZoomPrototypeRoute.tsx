"use client";

import dynamic from "next/dynamic";

const ZoomPrototypePage = dynamic(
  () => import("./ZoomPrototypePage").then((module) => module.ZoomPrototypePage),
  { ssr: false },
);

export function ZoomPrototypeRoute() {
  return <ZoomPrototypePage />;
}
