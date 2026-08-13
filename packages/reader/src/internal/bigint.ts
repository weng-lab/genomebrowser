const MAX_SAFE_INTEGER = 9_007_199_254_740_991n;

export function unsignedBigIntToNumber(value: bigint, name = "value"): number {
  if (value < 0n || value > MAX_SAFE_INTEGER) {
    throw new RangeError(`${name} cannot be represented as a safe unsigned number`);
  }

  return Number(value);
}
