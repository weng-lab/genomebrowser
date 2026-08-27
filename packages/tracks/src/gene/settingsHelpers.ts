import { arrayMove } from "@dnd-kit/sortable";
import type { GeneTagColor } from "./types";

export function reorderTagColors(
  tagColors: GeneTagColor[],
  activeTag: string,
  overTag: string,
): GeneTagColor[] {
  const activeIndex = tagColors.findIndex(({ tag }) => tag === activeTag);
  const overIndex = tagColors.findIndex(({ tag }) => tag === overTag);
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return tagColors;
  return arrayMove(tagColors, activeIndex, overIndex);
}
