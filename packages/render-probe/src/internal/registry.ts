import type { FiberRoot } from "bippy";

/**
 * Commit routing shared between the setup module and `renderWithProbe`.
 *
 * Kept on `globalThis` because vitest re-evaluates this source per test file while
 * externalized dependencies such as bippy and react-dom stay cached in the worker.
 */
interface Registry {
  onCommit: ((root: FiberRoot) => void) | null;
}

const KEY = Symbol.for("@weng-lab/render-probe");

type RegistryGlobal = typeof globalThis & { [KEY]?: Registry };

export function getRegistry(): Registry | undefined {
  return (globalThis as RegistryGlobal)[KEY];
}

export function createRegistry(): Registry {
  const target = globalThis as RegistryGlobal;
  target[KEY] ??= { onCommit: null };
  return target[KEY];
}
