import type { RepeatCategory, StandardRepeatMaskerRepeat } from "./types";
export function repeatCategory(value: string): RepeatCategory {
  const label = value.replace(/\?$/, "");
  if (["SINE", "LINE", "LTR", "DNA", "Satellite", "Other", "Unknown"].includes(label))
    return label as RepeatCategory;
  if (label === "Simple_repeat") return "Simple";
  if (label === "Low_complexity") return "Low_complexity";
  if (label.endsWith("RNA")) return "RNA";
  return label === "" ? "Unknown" : "Other";
}
export function repeatShade(repeat: StandardRepeatMaskerRepeat): string {
  const error = Math.min(500, repeat.milliDiv + repeat.milliDel + repeat.milliIns);
  const gray = Math.round((230 * error) / 500);
  return `rgb(${gray},${gray},${gray})`;
}
