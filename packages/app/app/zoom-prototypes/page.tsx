import type { Metadata } from "next";
import { ZoomPrototypeRoute } from "../../components/ZoomPrototypeRoute";

export const metadata: Metadata = {
  title: "Genome browser zoom prototypes",
};

export default function Page() {
  return <ZoomPrototypeRoute />;
}
