import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Movable = {
  content: ReactNode;
  /** Holds the rendered content. Null on the server, while hydrating, and without content. */
  node: HTMLElement | null;
};

const subscribeNothing = () => () => {};

function createNode() {
  if (typeof document === "undefined") return null;
  const node = document.createElement("div");
  // Its contents lay out as children of whichever slot holds it.
  node.style.display = "contents";
  return node;
}

/**
 * Renders `content` once so it can be shown in one of several `MovableSlot`s. Moving it
 * between slots moves the same DOM, so it keeps its state instead of remounting. Render
 * the returned portal anywhere in the tree that should provide the content's context.
 */
export function useMovable(content: ReactNode): [Movable, ReactNode] {
  const [node] = useState(createNode);
  // The server has no node, so hydration renders the content in place first.
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const movable = { content, node: hydrated && content !== null ? node : null };
  return [movable, movable.node && createPortal(content, movable.node)];
}

/** Shows the movable content while `active`, and nothing otherwise. */
export function MovableSlot({ movable, active }: { movable: Movable; active: boolean }) {
  const slot = useRef<HTMLDivElement>(null);
  const { node } = movable;

  // Attaches the content to this slot's DOM while active.
  useLayoutEffect(() => {
    const target = slot.current;
    if (!active || !node || !target) return;
    target.append(node);
    return () => {
      if (node.parentNode !== target) return;
      const focused = node.contains(document.activeElement) ? document.activeElement : null;
      node.remove();
      // Removing the content drops its focus. The slot taking it attaches it in this same
      // commit, before the microtask runs, so focus returns once the content is shown again.
      if (focused instanceof HTMLElement)
        queueMicrotask(() => {
          if (focused.isConnected) focused.focus({ preventScroll: true });
        });
    };
  }, [active, node]);

  if (!node) return active ? movable.content : null;
  return <div ref={slot} style={{ display: "contents" }} />;
}
