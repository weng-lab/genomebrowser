const MAX_SAFE_INTEGER = 9_007_199_254_740_991n;
const MAX_UINT64 = 18_446_744_073_709_551_615n;

export function unsignedBigIntToNumber(value: bigint, name = "value"): number {
  if (value < 0n || value > MAX_SAFE_INTEGER) {
    throw new RangeError(`${name} cannot be represented as a safe unsigned number`);
  }

  return Number(value);
}

export function addUint64Offset(
  offset: bigint,
  byteLength: bigint,
  name = "Unsigned 64-bit offset",
): bigint {
  if (offset < 0n || byteLength < 0n) {
    throw new RangeError(`${name} operands must be unsigned`);
  }
  const result = offset + byteLength;
  if (result > MAX_UINT64) {
    throw new RangeError(`${name} exceeds the unsigned 64-bit limit`);
  }
  return result;
}

export function checkedByteLength(itemCount: number, itemByteLength: bigint, name: string): bigint {
  const byteLength = BigInt(itemCount) * itemByteLength;
  unsignedBigIntToNumber(byteLength, name);
  return byteLength;
}
