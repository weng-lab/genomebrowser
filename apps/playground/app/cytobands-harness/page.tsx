import type { Metadata } from "next";

import { CytobandHarness } from "./CytobandHarness";

export const metadata: Metadata = {
  title: "Cytobands harness",
};

export default function Page() {
  return <CytobandHarness />;
}
