export function tickStep(span: number, width: number): number {
  const target = span / Math.max(1, width / 110);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  return Math.max(
    1,
    ([1, 2, 5, 10].find((factor) => factor * magnitude >= target) ?? 10) * magnitude,
  );
}
