import { createElement, useCallback } from "react";
import { useTooltipStore } from "../store/tooltipStore";
import DefaultTooltip from "../components/tooltip/defaultTooltip";

/**
 * This hook is used to handle interactions with a component.
 * It returns a set of callback functions that automatically
 * show the tooltip on hover and hide it on leave.
 * @param T - the type of the item to be used during the interaction
 * @param onCLick - the onClick callback function
 * @param onHover - the onHover callback function
 * @param onLeave - the onLeave callback function
 * @param tooltip - the tooltip component (uses item as props)
 * @returns a set of callback functions
 */
export default function useInteraction<T>({
  onClick,
  onHover,
  onLeave,
  tooltip,
}: {
  onClick: ((item: T) => void) | undefined;
  onHover: ((item: T) => void) | undefined;
  onLeave: ((item: T) => void) | undefined;
  tooltip: React.FC<T> | undefined;
}) {
  const showTooltip = useTooltipStore((state) => state.showTooltip);
  const hideTooltip = useTooltipStore((state) => state.hideTooltip);

  const handleHover = useCallback(
    (item: T, fallback: string, e: React.MouseEvent) => {
      if (onHover) {
        onHover(item);
      }
      const content = tooltip ? createElement(tooltip as React.FC<any>, item) : <DefaultTooltip value={fallback} />;
      showTooltip(content, e.clientX, e.clientY);
    },
    [onHover, tooltip, showTooltip]
  );

  const handleLeave = useCallback(
    (item: T) => {
      if (onLeave) {
        onLeave(item);
      }
      hideTooltip();
    },
    [onLeave, hideTooltip]
  );

  const handleClick = useCallback(
    (item: T) => {
      if (onClick) {
        onClick(item);
      }
    },
    [onClick]
  );

  return {
    handleClick,
    handleHover,
    handleLeave,
  };
}
