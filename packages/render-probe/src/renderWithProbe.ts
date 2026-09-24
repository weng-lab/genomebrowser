import { traverseRenderedFibers, type Fiber, type FiberRoot } from "bippy";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { componentName, instanceName, isCountedFiber, renderReasons } from "./internal/fibers";
import { getRegistry } from "./internal/registry";
import { createReport, type InstanceRenders, type RenderReport } from "./report";

/** A mounted React tree whose committed renders can be measured. */
export interface Probe {
  /** The report for the initial mount. */
  readonly mounted: RenderReport;
  /**
   * Runs `action` inside `act`, lets effects and immediately resolving promises settle,
   * and reports every commit in between. Fake timers must be advanced inside `action`.
   */
  measure(action: () => unknown): Promise<RenderReport>;
  /** Renders new props into the root. Call it inside `measure`. */
  rerender(ui: ReactNode): void;
  /** Unmounts the tree and removes its container. */
  unmount(): void;
}

const SETTLE_ROUNDS = 50;
const MICROTASKS_PER_ROUND = 20;

let active: Probe | null = null;

/** Mounts `ui` into a fresh container, without `StrictMode`, and records its renders. */
export async function renderWithProbe(ui: ReactNode): Promise<Probe> {
  const registry = getRegistry();
  const hook = (
    globalThis as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: { renderers?: Map<unknown, unknown> } }
  ).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!registry || !hook?.renderers?.size) {
    throw new Error(
      'render-probe: the setup module has not run before react-dom loaded. Add "@weng-lab/render-probe/setup" to `test.setupFiles` in the vitest config.',
    );
  }
  if (typeof document === "undefined") {
    throw new Error(
      "render-probe: renderWithProbe needs a DOM. Add `// @vitest-environment jsdom` to the test file.",
    );
  }
  if (active) {
    throw new Error(
      "render-probe: another probe is still mounted. Only one probe may run at a time; call probe.unmount() (for example in afterEach) before starting another.",
    );
  }

  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const container = document.createElement("div");
  document.body.append(container);
  const root: Root = createRoot(container);

  let instances = new Map<string, InstanceRenders>();
  let commits = 0;
  let unmounted = false;
  let committedRoot: FiberRoot | null = null;

  registry.onCommit = (fiberRoot: FiberRoot) => {
    if ((fiberRoot as { containerInfo?: unknown }).containerInfo !== container) return;
    commits += 1;
    committedRoot = fiberRoot;
    const boundary = fiberRoot.current as Fiber;
    traverseRenderedFibers(fiberRoot, (fiber, phase) => {
      if (phase === "unmount" || !isCountedFiber(fiber)) return;
      const instance = instanceName(fiber, boundary);
      const entry = instances.get(instance) ?? {
        name: componentName(fiber),
        renders: 0,
        because: new Set(),
      };
      entry.renders += 1;
      for (const reason of renderReasons(fiber)) entry.because.add(reason);
      instances.set(instance, entry);
    });
  };

  const record = async (action: () => unknown): Promise<RenderReport> => {
    if (unmounted) throw new Error("render-probe: this probe has been unmounted.");
    instances = new Map();
    await act(async () => {
      await action();
    });
    await settle();
    const report = createReport(mountedComponents(committedRoot), instances);
    instances = new Map();
    return report;
  };

  // Keep flushing microtasks until a round passes without a commit, so work such as a
  // fetch that resolves on the next tick lands inside the measurement.
  const settle = async () => {
    for (let round = 0; round < SETTLE_ROUNDS; round++) {
      const before = commits;
      await act(async () => {
        for (let i = 0; i < MICROTASKS_PER_ROUND; i++) await Promise.resolve();
      });
      if (commits === before) return;
    }
  };

  const probe: Probe = {
    mounted: undefined as unknown as RenderReport,
    measure: record,
    rerender(nextUi) {
      root.render(nextUi);
    },
    unmount() {
      if (unmounted) return;
      unmounted = true;
      act(() => root.unmount());
      container.remove();
      registry.onCommit = null;
      active = null;
    },
  };
  active = probe;

  try {
    (probe as { mounted: RenderReport }).mounted = await record(() => root.render(ui));
  } catch (error) {
    probe.unmount();
    throw error;
  }
  return probe;
}

function mountedComponents(fiberRoot: FiberRoot | null): string[] {
  const names: string[] = [];
  const visit = (fiber: Fiber | null) => {
    for (let node = fiber; node; node = node.sibling) {
      if (isCountedFiber(node)) names.push(componentName(node));
      visit(node.child);
    }
  };
  visit(fiberRoot ? (fiberRoot.current as Fiber).child : null);
  return names;
}
