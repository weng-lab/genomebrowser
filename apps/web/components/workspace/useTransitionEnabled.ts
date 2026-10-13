import { useLayoutEffect, useState, useSyncExternalStore } from "react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia?.(reducedMotionQuery);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

const readReducedMotion = () => window.matchMedia?.(reducedMotionQuery).matches ?? false;

/**
 * Allow CSS transitions after a layout reset has painted. Changing resetKey
 * suppresses transitions before commit; reduced motion always suppresses them.
 * Use a stable page ID for navigation or a size for instant resizing.
 */
export function useTransitionEnabled(resetKey: string | number): boolean {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    () => false,
  );
  const [request, setRequest] = useState({ key: resetKey, ready: false });

  // Reset during rendering so CSS cannot animate the destination layout. Also
  // invalidate an earlier request when navigating away and quickly returning.
  if (request.key !== resetKey) setRequest({ key: resetKey, ready: false });

  useLayoutEffect(() => {
    if (request.key !== resetKey || request.ready) return;
    let releaseFrame = 0;
    const paintFrame = requestAnimationFrame(() => {
      // RAF runs before paint. A second callback lets the reset layout paint
      // with transitions disabled before restoring transition permission.
      releaseFrame = requestAnimationFrame(() => {
        setRequest((current) => (current === request ? { ...current, ready: true } : current));
      });
    });
    return () => {
      cancelAnimationFrame(paintFrame);
      cancelAnimationFrame(releaseFrame);
    };
  }, [request, resetKey]);

  return request.key === resetKey && request.ready && !reducedMotion;
}
