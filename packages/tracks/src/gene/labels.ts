const labelGap = 5;
const averageCharacterWidth = 0.6;

export type GeneLabelLayout = {
  text: string;
  x: number;
  anchor: "start" | "end";
  start: number;
  end: number;
};

export function createGeneLabelLayout(
  text: string,
  featureStart: number,
  featureEnd: number,
  viewportWidth: number,
  fontSize: number,
): GeneLabelLayout | null {
  const width = text.length * fontSize * averageCharacterWidth;
  const rightStart = featureEnd + labelGap;
  if (rightStart + width <= viewportWidth) {
    return { text, x: rightStart, anchor: "start", start: rightStart, end: rightStart + width };
  }

  const leftEnd = featureStart - labelGap;
  if (leftEnd - width >= 0) {
    return { text, x: leftEnd, anchor: "end", start: leftEnd - width, end: leftEnd };
  }

  return null;
}
