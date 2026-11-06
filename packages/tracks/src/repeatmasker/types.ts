import type { BigRmskData, BigRmskRepeat } from "./joined/types";
import type { StandardRepeatMaskerData, StandardRepeatMaskerItem } from "./standard/types";

export type RepeatMaskerItem = StandardRepeatMaskerItem | BigRmskRepeat;
export type RepeatMaskerData =
  | { view: "standard"; url: string; data: StandardRepeatMaskerData }
  | { view: "joined"; url: string; data: BigRmskData }
  | { view: "joined-summary"; url: string; data: StandardRepeatMaskerData };
