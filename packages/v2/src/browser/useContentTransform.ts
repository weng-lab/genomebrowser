import { useCallback, useEffect, useRef } from "react";

export function useContentTransform(baseContentX: number) {
  const deltaPxRef = useRef(0);
  const contentGroupsRef = useRef(new Set<SVGGElement>());

  const getContentOffset = useCallback(() => deltaPxRef.current, []);

  const setContentOffset = useCallback(
    (nextDeltaPx: number) => {
      deltaPxRef.current = nextDeltaPx;
      for (const contentGroup of contentGroupsRef.current) {
        contentGroup.setAttribute("transform", `translate(${baseContentX + nextDeltaPx},0)`);
      }
    },
    [baseContentX],
  );

  const registerContentGroup = useCallback(
    (node: SVGGElement) => {
      contentGroupsRef.current.add(node);
      node.setAttribute("transform", `translate(${baseContentX + deltaPxRef.current},0)`);
      return () => {
        contentGroupsRef.current.delete(node);
      };
    },
    [baseContentX],
  );

  useEffect(() => {
    setContentOffset(deltaPxRef.current);
  }, [setContentOffset]);

  return {
    getContentOffset,
    setContentOffset,
    registerContentGroup,
  };
}
