import { getDisplayName, getReactWorkTagsForFiber, isCompositeFiber, type Fiber } from "bippy";

export type RenderReason = "mount" | "state" | "context" | "parent" | `props.${string}`;

interface Hook {
  memoizedState: unknown;
  queue: unknown;
  next: Hook | null;
}

interface ContextDependency {
  memoizedValue: unknown;
  next: ContextDependency | null;
}

/**
 * Composite fibers that represent a component render. The outer fiber of a
 * `memo(Component, compare)` or `memo(forwardRef(...))` is skipped because its inner
 * fiber renders the component and would otherwise be counted twice.
 */
export function isCountedFiber(fiber: Fiber): boolean {
  return isCompositeFiber(fiber) && fiber.tag !== getReactWorkTagsForFiber(fiber).MemoComponent;
}

export function componentName(fiber: Fiber): string {
  return getDisplayName(fiber.type) || "Anonymous";
}

/** The component name plus the React key path to it, or its sibling index if unkeyed. */
export function instanceName(fiber: Fiber, boundary: Fiber): string {
  const keys: string[] = [];
  for (let node: Fiber | null = fiber; node && node !== boundary; node = node.return) {
    if (node.key !== null) keys.unshift(node.key);
  }
  return `${componentName(fiber)}#${keys.length > 0 ? keys.join("/") : fiber.index}`;
}

export function renderReasons(fiber: Fiber): RenderReason[] {
  const previous = fiber.alternate;
  if (!previous) return ["mount"];

  const reasons: RenderReason[] = [];
  const props = fiber.memoizedProps ?? {};
  const previousProps = previous.memoizedProps ?? {};
  const propNames = new Set([...Object.keys(previousProps), ...Object.keys(props)]);
  for (const name of [...propNames].sort()) {
    if (!Object.is(previousProps[name], props[name])) reasons.push(`props.${name}`);
  }
  if (stateChanged(fiber, previous)) reasons.push("state");
  if (contextChanged(fiber, previous)) reasons.push("context");
  return reasons.length > 0 ? reasons : ["parent"];
}

function stateChanged(fiber: Fiber, previous: Fiber): boolean {
  if (fiber.tag === getReactWorkTagsForFiber(fiber).ClassComponent) {
    return !Object.is(fiber.memoizedState, previous.memoizedState);
  }
  // Only hooks with an update queue (useState, useReducer, useSyncExternalStore, ...)
  // hold state. Effect and memo hooks rebuild their memoized value on every render.
  let hook = fiber.memoizedState as Hook | null;
  let previousHook = previous.memoizedState as Hook | null;
  while (hook && previousHook) {
    if (hook.queue != null && !Object.is(hook.memoizedState, previousHook.memoizedState)) {
      return true;
    }
    hook = hook.next;
    previousHook = previousHook.next;
  }
  return false;
}

function contextChanged(fiber: Fiber, previous: Fiber): boolean {
  let dependency = fiber.dependencies?.firstContext as ContextDependency | null | undefined;
  let previousDependency = previous.dependencies?.firstContext as
    | ContextDependency
    | null
    | undefined;
  while (dependency && previousDependency) {
    if (!Object.is(dependency.memoizedValue, previousDependency.memoizedValue)) return true;
    dependency = dependency.next;
    previousDependency = previousDependency.next;
  }
  return false;
}
