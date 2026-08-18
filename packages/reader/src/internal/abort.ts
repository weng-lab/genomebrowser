export function throwIfAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted();
}
