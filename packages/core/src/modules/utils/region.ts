export function formatLength(length: number): string {
  if (length >= 1e9) return `${Math.round(length / 1e9)} Gb`;
  if (length >= 1e6) return `${Math.round(length / 1e6)} Mb`;
  if (length >= 1e3) return `${Math.round(length / 1e3)} kb`;
  return `${length} bp`;
}
