import type { Metadata } from "next";
import { ZoomPrototypeRoute } from "../../components/ZoomPrototypeRoute";

export const metadata: Metadata = {
  title: "Zoom prototypes",
};

export default function Page() {
  return <ZoomPrototypeRoute />;
}
