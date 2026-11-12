import type { BigRmskRepeat } from "./types";

const classColors: Record<string, string> = {
  SINE: "#1f77b4",
  LINE: "#ff7f0e",
  LTR: "#2ca02c",
  DNA: "#d62728",
  Simple_repeat: "#9467bd",
  Low_complexity: "#8c564b",
  Satellite: "#e377c2",
  RNA: "#7f7f7f",
  Other: "#bcbd22",
  Unknown: "#17becf",
};

export function repeatColor(repeat: BigRmskRepeat): string {
  const repeatClass = repeat.repeatClass.replace(/\?$/, "");
  if (["rRNA", "tRNA", "snRNA", "scRNA", "srpRNA"].includes(repeatClass)) return classColors.RNA!;
  return (
    classColors[repeatClass] ?? (repeatClass === "RC" ? classColors.Other! : classColors.Unknown!)
  );
}
