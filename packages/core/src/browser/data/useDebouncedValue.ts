import { useEffect, useState } from "react";

/**
 * Trailing-edge debounce for rapidly changing values such as resize-driven
 * widths. The initial value passes through immediately; later changes settle
 * for `delayMs` before propagating. A non-positive delay propagates every
 * change without debouncing.
 *
 * When `resetKey` changes, any pending debounce is discarded and the latest
 * value is adopted in the same commit. Callers pass a key derived from their
 * other inputs so a combined change propagates as one update instead of a
 * stale-value update followed by a debounced catch-up.
 */
export function useDebouncedValue<Value>(value: Value, delayMs: number, resetKey?: unknown): Value {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [previousResetKey, setPreviousResetKey] = useState(resetKey);
  if (!Object.is(resetKey, previousResetKey)) {
    setPreviousResetKey(resetKey);
    setDebouncedValue(value);
  }

  useEffect(() => {
    if (Object.is(value, debouncedValue)) return;
    if (delayMs <= 0) {
      setDebouncedValue(value);
      return;
    }
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [debouncedValue, delayMs, value]);

  return debouncedValue;
}
