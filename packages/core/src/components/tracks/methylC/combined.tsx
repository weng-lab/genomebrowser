import SplitMethylC from "./split";
import type { MethylCRendererProps } from "./types";

export default function CombinedMethylC(props: MethylCRendererProps) {
  return <SplitMethylC {...props} />;
}
